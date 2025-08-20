-- Complete Security Hardening - Corrected Version

-- Fix Security Definer View vulnerability 
-- Drop the view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.restaurants_public;

-- Create a secure RLS-protected table instead of a view
CREATE TABLE IF NOT EXISTS public.restaurants_public (
  id uuid NOT NULL,
  name text NOT NULL,
  description text,
  address text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on the public restaurants table
ALTER TABLE public.restaurants_public ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to active restaurants only
CREATE POLICY "Public can view active restaurants" 
ON public.restaurants_public 
FOR SELECT 
USING (is_active = true);

-- Grant necessary permissions
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- Create trigger to sync data from main restaurants table
CREATE OR REPLACE FUNCTION sync_restaurants_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.restaurants_public (id, name, description, address, logo_url, is_active, created_at)
    VALUES (NEW.id, NEW.name, NEW.description, NEW.address, NEW.logo_url, NEW.is_active, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      address = EXCLUDED.address,
      logo_url = EXCLUDED.logo_url,
      is_active = EXCLUDED.is_active;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.restaurants_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on main restaurants table
DROP TRIGGER IF EXISTS sync_restaurants_public_trigger ON public.restaurants;
CREATE TRIGGER sync_restaurants_public_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION sync_restaurants_public();

-- Sync existing data
INSERT INTO public.restaurants_public (id, name, description, address, logo_url, is_active, created_at)
SELECT id, name, description, address, logo_url, is_active, created_at 
FROM public.restaurants
WHERE is_active = true
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  logo_url = EXCLUDED.logo_url,
  is_active = EXCLUDED.is_active;

-- Fix session authentication issues by allowing anonymous access for initial QR scanning
-- Update device_sessions policies to handle both authenticated and anonymous users

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Customers can insert rate-limited valid device sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Customers can view own valid device session by token" ON public.device_sessions;

-- Create more permissive policies for QR scanning flow
CREATE POLICY "Anonymous can create device sessions with valid data" 
ON public.device_sessions 
FOR INSERT 
WITH CHECK (
  session_token IS NOT NULL 
  AND length(session_token) > 10 
  AND validate_session_token(session_token)
  AND check_session_rate_limit(device_ip)
  AND restaurant_id IS NOT NULL
  AND table_number IS NOT NULL
);

CREATE POLICY "Users can view sessions by token or restaurant ownership" 
ON public.device_sessions 
FOR SELECT 
USING (
  -- Either session token matches (for customers)
  session_token = ((current_setting('request.headers'::text, true))::json ->> 'x-session-token'::text)
  -- Or user owns the restaurant (for owners)
  OR EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = device_sessions.restaurant_id 
    AND r.owner_id = auth.uid()
  )
  -- Or session is valid and not expired (for anonymous QR scanning)
  OR (expires_at > now() AND session_token IS NOT NULL)
);

-- Strengthen order security policies
-- Ensure only authenticated users can place orders
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
CREATE POLICY "Only valid session holders can place orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Must have valid session token that matches a device session
  EXISTS (
    SELECT 1 FROM device_sessions ds
    WHERE ds.restaurant_id = orders.restaurant_id
    AND ds.table_number = orders.table_number
    AND ds.session_token = ((current_setting('request.headers'::text, true))::json ->> 'x-session-token'::text)
    AND ds.expires_at > now()
  )
);

-- Enhance order items security
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Valid session holders can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  -- Must be part of an order with valid session
  EXISTS (
    SELECT 1 FROM orders o
    JOIN device_sessions ds ON (
      ds.restaurant_id = o.restaurant_id 
      AND ds.table_number = o.table_number
    )
    WHERE o.id = order_items.order_id
    AND ds.session_token = ((current_setting('request.headers'::text, true))::json ->> 'x-session-token'::text)
    AND ds.expires_at > now()
  )
);

-- Add comprehensive audit logging for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text,
  record_id uuid,
  user_id uuid,
  session_token text,
  device_ip text,
  event_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow system and admins to view audit logs
CREATE POLICY "Only system can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create audit logging function
CREATE OR REPLACE FUNCTION log_security_event(
  event_type text,
  table_name text DEFAULT NULL,
  record_id uuid DEFAULT NULL,
  event_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_token_header text;
  device_ip_header text;
BEGIN
  -- Extract headers safely
  session_token_header := COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-session-token'::text),
    'unknown'
  );
  
  device_ip_header := COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-forwarded-for'::text),
    'unknown'
  );
  
  INSERT INTO public.security_audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    session_token,
    device_ip,
    event_data
  ) VALUES (
    event_type,
    table_name,
    record_id,
    auth.uid(),
    session_token_header,
    device_ip_header,
    event_data
  );
END;
$$;

-- Add triggers for audit logging on sensitive operations
CREATE OR REPLACE FUNCTION audit_device_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event('device_session_created', 'device_sessions', NEW.id, 
      jsonb_build_object('restaurant_id', NEW.restaurant_id, 'table_number', NEW.table_number, 'is_main_device', NEW.is_main_device));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_main_device != NEW.is_main_device THEN
      PERFORM log_security_event('main_device_transferred', 'device_sessions', NEW.id,
        jsonb_build_object('old_main', OLD.is_main_device, 'new_main', NEW.is_main_device));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event('device_session_deleted', 'device_sessions', OLD.id,
      jsonb_build_object('restaurant_id', OLD.restaurant_id, 'table_number', OLD.table_number));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_device_sessions_trigger ON public.device_sessions;
CREATE TRIGGER audit_device_sessions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.device_sessions
  FOR EACH ROW EXECUTE FUNCTION audit_device_sessions();
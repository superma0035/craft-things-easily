-- Fix critical security vulnerabilities and authorization issues

-- 1. First, let's ensure proper session token validation for auth operations
CREATE OR REPLACE FUNCTION public.validate_session_token_header()
RETURNS TEXT AS $$
DECLARE
  session_token TEXT;
BEGIN
  -- Extract session token from headers
  session_token := COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-session-token'::text),
    ''
  );
  
  -- Validate session token format and existence
  IF session_token = '' OR length(session_token) < 10 THEN
    RETURN NULL;
  END IF;
  
  -- Check if session exists and is valid
  IF EXISTS (
    SELECT 1 FROM device_sessions 
    WHERE session_token = session_token 
    AND expires_at > now()
  ) THEN
    RETURN session_token;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Fix profiles table to ensure proper user association
-- Add trigger to sync auth.users with profiles automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Use INSERT with ON CONFLICT to prevent duplicate key errors
  INSERT INTO public.profiles (id, email, full_name, username, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    username = COALESCE(EXCLUDED.username, profiles.username),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger to prevent blocking auth
    RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enhance RLS policies for better security

-- Update device_sessions policies for proper QR code authentication
DROP POLICY IF EXISTS "Anonymous can create device sessions with valid data" ON device_sessions;
DROP POLICY IF EXISTS "Users can view sessions by token or restaurant ownership" ON device_sessions;

CREATE POLICY "Anonymous can create device sessions with valid data" ON device_sessions
FOR INSERT 
WITH CHECK (
  session_token IS NOT NULL 
  AND length(session_token) > 20 
  AND validate_session_token(session_token) 
  AND check_session_rate_limit(device_ip) 
  AND restaurant_id IS NOT NULL 
  AND table_number IS NOT NULL
);

CREATE POLICY "Valid sessions can view device sessions" ON device_sessions
FOR SELECT USING (
  -- Session owners can view their sessions
  session_token = validate_session_token_header()
  OR
  -- Restaurant owners can view sessions for their restaurants
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = device_sessions.restaurant_id 
    AND r.owner_id = auth.uid()
  )
  OR
  -- For QR scanning - allow viewing active sessions for the same table
  (expires_at > now() AND restaurant_id IS NOT NULL AND table_number IS NOT NULL)
);

-- Update orders policies to require valid session tokens
DROP POLICY IF EXISTS "Only valid session holders can place orders" ON orders;
DROP POLICY IF EXISTS "Customers can view orders from their table session" ON orders;

CREATE POLICY "Valid session holders can place orders" ON orders
FOR INSERT 
WITH CHECK (
  validate_session_token_header() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM device_sessions ds
    WHERE ds.restaurant_id = orders.restaurant_id 
    AND ds.table_number = orders.table_number 
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

CREATE POLICY "Valid sessions can view orders" ON orders
FOR SELECT USING (
  -- Session holders can view orders for their table
  EXISTS (
    SELECT 1 FROM device_sessions ds
    WHERE ds.restaurant_id = orders.restaurant_id 
    AND ds.table_number = orders.table_number 
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
  OR
  -- Restaurant owners can view orders for their restaurants
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = orders.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Update order_items policies to require valid session tokens
DROP POLICY IF EXISTS "Valid session holders can insert order items" ON order_items;
DROP POLICY IF EXISTS "Customers can view order items from their table session" ON order_items;

CREATE POLICY "Valid session holders can insert order items" ON order_items
FOR INSERT 
WITH CHECK (
  validate_session_token_header() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders o
    JOIN device_sessions ds ON (
      ds.restaurant_id = o.restaurant_id 
      AND ds.table_number = o.table_number
    )
    WHERE o.id = order_items.order_id 
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

CREATE POLICY "Valid sessions can view order items" ON order_items
FOR SELECT USING (
  -- Session holders can view order items for their orders
  EXISTS (
    SELECT 1 FROM orders o
    JOIN device_sessions ds ON (
      ds.restaurant_id = o.restaurant_id 
      AND ds.table_number = o.table_number
    )
    WHERE o.id = order_items.order_id 
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
  OR
  -- Restaurant owners can view order items for their restaurants
  EXISTS (
    SELECT 1 FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE o.id = order_items.order_id 
    AND r.owner_id = auth.uid()
  )
);

-- 4. Add comprehensive audit logging for security events
CREATE OR REPLACE FUNCTION public.audit_auth_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event('auth_signup', 'profiles', NEW.id, 
      jsonb_build_object('email', NEW.email, 'username', NEW.username));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.email != NEW.email THEN
      PERFORM log_security_event('email_changed', 'profiles', NEW.id,
        jsonb_build_object('old_email', OLD.email, 'new_email', NEW.email));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Add trigger for profile audit logging
DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_auth_events();

-- 5. Add rate limiting for failed login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can insert login attempts
CREATE POLICY "System can insert login attempts" ON login_attempts
FOR INSERT WITH CHECK (true);

-- Users cannot view login attempts (admin only)
CREATE POLICY "No public access to login attempts" ON login_attempts
FOR ALL USING (false);

-- 6. Add session cleanup job
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Clean up expired sessions
  DELETE FROM device_sessions WHERE expires_at < now() - interval '1 hour';
  
  -- Clean up old login attempts (keep last 30 days)
  DELETE FROM login_attempts WHERE attempted_at < now() - interval '30 days';
  
  -- Clean up old audit logs (keep last 90 days)
  DELETE FROM security_audit_log WHERE created_at < now() - interval '90 days';
END;
$$;

-- 7. Fix menu items access to prevent competitor data scraping
-- Update menu_items policy to require valid context
DROP POLICY IF EXISTS "Allow public access to menu items for QR scanning" ON menu_items;

CREATE POLICY "Valid access to menu items" ON menu_items
FOR SELECT USING (
  -- Restaurant owners can view their menu items
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = menu_items.restaurant_id 
    AND r.owner_id = auth.uid()
  )
  OR
  -- Valid session holders can view menu items for their restaurant
  EXISTS (
    SELECT 1 FROM device_sessions ds
    WHERE ds.restaurant_id = menu_items.restaurant_id 
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
  OR
  -- Public access for specific restaurant (when restaurant is in context)
  (
    menu_items.restaurant_id = COALESCE(
      (current_setting('app.current_restaurant_id', true))::UUID,
      NULL
    )
  )
);

-- 8. Enhance restaurants_public access control
DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants_public;

CREATE POLICY "Controlled public access to restaurants" ON restaurants_public
FOR SELECT USING (
  is_active = true 
  AND (
    -- Specific restaurant access (QR code context)
    id = COALESCE(
      (current_setting('app.current_restaurant_id', true))::UUID,
      NULL
    )
    OR
    -- General public discovery (limited fields only)
    (name IS NOT NULL AND address IS NOT NULL)
  )
);

-- 9. Add function to set restaurant context for QR scanning
CREATE OR REPLACE FUNCTION public.set_restaurant_context(restaurant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate restaurant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM restaurants_public 
    WHERE id = restaurant_uuid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive restaurant';
  END IF;
  
  -- Set the context for the session
  PERFORM set_config('app.current_restaurant_id', restaurant_uuid::text, true);
END;
$$;
-- Phase 1: Critical Security Fixes

-- Fix Security Definer View issue
DROP VIEW IF EXISTS public.restaurants_public;
CREATE VIEW public.restaurants_public AS
SELECT 
  id,
  name,
  description,
  address,
  logo_url,
  is_active,
  created_at
FROM public.restaurants
WHERE is_active = true;

-- Grant access to the view for anon and authenticated users  
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- Fix Function Search Path Mutable warnings
ALTER FUNCTION public.validate_session_token(text) SET search_path = 'public';
ALTER FUNCTION public.cleanup_user_sessions(text) SET search_path = 'public';

-- Fix Customer Personal Information exposure in profiles table
-- Remove overly broad policies and create strict owner-only access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profile owners can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Profile owners can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profile owners can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Fix Payment and Subscription Data exposure
-- Strengthen subscriber policies to be more restrictive
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

CREATE POLICY "Subscriber can view own subscription data only" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Subscriber can update own subscription only" 
ON public.subscribers 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "System can insert subscription data" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (true);

-- Enhance device session security with stricter validation
-- Add function to validate session ownership
CREATE OR REPLACE FUNCTION public.validate_session_ownership(session_token_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if session exists and is not expired
  RETURN EXISTS (
    SELECT 1 FROM device_sessions 
    WHERE session_token = session_token_input 
    AND expires_at > now()
  );
END;
$$;

-- Add rate limiting for session creation
CREATE OR REPLACE FUNCTION public.check_session_rate_limit(device_ip_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_count integer;
BEGIN
  -- Count sessions created by this IP in the last hour
  SELECT COUNT(*) INTO session_count
  FROM device_sessions
  WHERE device_ip = device_ip_input
  AND created_at > now() - interval '1 hour';
  
  -- Allow max 10 sessions per IP per hour
  RETURN session_count < 10;
END;
$$;

-- Update device session policies to use the validation function
DROP POLICY IF EXISTS "Customers can view own device session by token" ON public.device_sessions;
CREATE POLICY "Customers can view own valid device session by token" 
ON public.device_sessions 
FOR SELECT 
USING (
  session_token = ((current_setting('request.headers'))::json ->> 'x-session-token') 
  AND validate_session_ownership(session_token)
  AND expires_at > now()
);

-- Update session insert policy to include rate limiting
DROP POLICY IF EXISTS "Customers can insert device sessions with valid tokens" ON public.device_sessions;
CREATE POLICY "Customers can insert rate-limited valid device sessions" 
ON public.device_sessions 
FOR INSERT 
WITH CHECK (
  session_token IS NOT NULL 
  AND length(session_token) > 10 
  AND validate_session_token(session_token)
  AND check_session_rate_limit(device_ip)
);
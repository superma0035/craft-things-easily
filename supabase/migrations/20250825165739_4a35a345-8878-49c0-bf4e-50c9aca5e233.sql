-- Fix the remaining security function search path issues

-- 1. Fix the validate_session_token_header function search path
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
    SELECT 1 FROM public.device_sessions 
    WHERE session_token = session_token 
    AND expires_at > now()
  ) THEN
    RETURN session_token;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- 2. Fix the set_restaurant_context function search path
CREATE OR REPLACE FUNCTION public.set_restaurant_context(restaurant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate restaurant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants_public 
    WHERE id = restaurant_uuid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive restaurant';
  END IF;
  
  -- Set the context for the session
  PERFORM set_config('app.current_restaurant_id', restaurant_uuid::text, true);
END;
$$;
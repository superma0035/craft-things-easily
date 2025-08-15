-- Fix critical security vulnerability: Restaurant Owner Contact Information Exposed to Public
-- Remove the permissive public access policy and create a restricted view

-- Drop the existing public access policy that exposes all restaurant data
DROP POLICY IF EXISTS "Allow public access to restaurant info for QR scanning" ON public.restaurants;

-- Create a view with only necessary public information
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

-- Create a new restrictive policy for the restaurants table
-- Only restaurant owners can access their full restaurant data
CREATE POLICY "Restaurant owners can view their own restaurants" 
ON public.restaurants 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Restaurant owners can still manage their restaurants
CREATE POLICY "Restaurant owners can update their own restaurants" 
ON public.restaurants 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can insert their own restaurants" 
ON public.restaurants 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can delete their own restaurants" 
ON public.restaurants 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Fix device sessions table to require proper session token validation
-- Add a function to validate session tokens
CREATE OR REPLACE FUNCTION public.validate_session_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic validation - token should be non-empty and contain underscores
  IF token IS NULL OR length(token) < 10 OR position('_' in token) = 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update device sessions policies to be more secure
DROP POLICY IF EXISTS "Customers can insert their own device session" ON public.device_sessions;
CREATE POLICY "Customers can insert device sessions with valid tokens" 
ON public.device_sessions 
FOR INSERT 
WITH CHECK (
  session_token IS NOT NULL 
  AND length(session_token) > 10 
  AND public.validate_session_token(session_token)
);

-- Add session cleanup on user disconnect
CREATE OR REPLACE FUNCTION public.cleanup_user_sessions(user_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.device_sessions 
  WHERE session_token = user_session_token 
  OR expires_at < now() - interval '1 hour';
END;
$$;
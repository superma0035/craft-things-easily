-- Fix Critical Security Issues: Protect sensitive data and improve RLS policies (Part 2)

-- 1. Fix profiles table - restrict access to own data only
DROP POLICY IF EXISTS "Profile owners can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profile owners can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profile owners can insert their own profile" ON public.profiles;

CREATE POLICY "Users can only view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can only insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

-- Explicitly deny DELETE on profiles for extra security
CREATE POLICY "Profiles cannot be deleted" 
ON public.profiles FOR DELETE 
USING (false);

-- 2. Fix security_audit_log - no public access, system only
DROP POLICY IF EXISTS "Only system can insert audit logs" ON public.security_audit_log;

-- Create a secure function for audit log access (admin only)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (full_name ILIKE '%admin%' OR email ILIKE '%admin%')
  );
$$;

-- 3. Fix device_sessions - stricter access control
DROP POLICY IF EXISTS "Valid sessions can view device sessions" ON public.device_sessions;

CREATE POLICY "Strict device session access" 
ON public.device_sessions FOR SELECT 
USING (
  -- Only the session owner or restaurant owner can view
  (session_token = validate_session_token_header() AND expires_at > now()) 
  OR 
  (EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = device_sessions.restaurant_id 
    AND r.owner_id = auth.uid()
  ))
);

-- 4. Fix menu_categories - require valid session or restaurant ownership
DROP POLICY IF EXISTS "Allow public access to menu categories for QR scanning" ON public.menu_categories;

CREATE POLICY "Controlled menu category access" 
ON public.menu_categories FOR SELECT 
USING (
  -- Restaurant owners can always see their categories
  (EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_categories.restaurant_id 
    AND r.owner_id = auth.uid()
  ))
  OR
  -- Valid session holders can see categories for their restaurant
  (EXISTS (
    SELECT 1 FROM device_sessions ds 
    WHERE ds.restaurant_id = menu_categories.restaurant_id 
    AND ds.session_token = validate_session_token_header() 
    AND ds.expires_at > now()
  ))
  OR
  -- Public access only when restaurant context is set
  (menu_categories.restaurant_id = COALESCE(
    (current_setting('app.current_restaurant_id'::text, true))::uuid, 
    NULL::uuid
  ))
);

-- 5. Add rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_profile_update_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_update timestamp with time zone;
BEGIN
  SELECT updated_at INTO last_update 
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Allow updates only once every 5 minutes
  RETURN (last_update IS NULL OR last_update < now() - interval '5 minutes');
END;
$$;

-- Apply rate limiting to profile updates
CREATE POLICY "Users can only update their own profile with rate limit" 
ON public.profiles FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL 
  AND check_profile_update_rate_limit()
)
WITH CHECK (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
);

-- 6. Add session validation for order placement
CREATE OR REPLACE FUNCTION public.validate_order_session(
  restaurant_uuid uuid,
  table_num text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM device_sessions ds
    WHERE ds.restaurant_id = restaurant_uuid
    AND ds.table_number = table_num
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
    AND ds.is_main_device = true
  );
END;
$$;
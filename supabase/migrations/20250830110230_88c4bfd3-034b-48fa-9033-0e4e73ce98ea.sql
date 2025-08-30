-- Final Security Hardening - Explicit Public Access Restrictions

-- 1. Add explicit public access denial for security_audit_log
CREATE POLICY "No public access to security audit logs" 
ON public.security_audit_log FOR ALL 
USING (false)
WITH CHECK (false);

-- 2. Add explicit public access denial for login_attempts  
CREATE POLICY "No public read access to login attempts" 
ON public.login_attempts FOR SELECT 
USING (false);

-- 3. Strengthen subscribers table security
DROP POLICY IF EXISTS "Users can only view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can only update own subscription" ON public.subscribers;

CREATE POLICY "Users can only view own subscription data" 
ON public.subscribers FOR SELECT 
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can only update own subscription data" 
ON public.subscribers FOR UPDATE 
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL)
WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- 4. Add explicit public access denial for profiles (additional safety)
CREATE POLICY "No anonymous access to profiles" 
ON public.profiles FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Strengthen device_sessions security with explicit checks
DROP POLICY IF EXISTS "Anonymous can create device sessions with valid data" ON public.device_sessions;

CREATE POLICY "Controlled device session creation" 
ON public.device_sessions FOR INSERT 
WITH CHECK (
  session_token IS NOT NULL 
  AND length(session_token) > 20 
  AND validate_session_token(session_token) 
  AND check_session_rate_limit(device_ip) 
  AND restaurant_id IS NOT NULL 
  AND table_number IS NOT NULL
  AND auth.uid() IS NULL  -- Only anonymous users can create sessions
);

-- 6. Add comprehensive security function for data access validation
CREATE OR REPLACE FUNCTION public.is_data_access_authorized(
  table_name text,
  operation text DEFAULT 'SELECT'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all data access attempts
  PERFORM log_security_event(
    'data_access_attempt',
    table_name,
    NULL,
    jsonb_build_object(
      'operation', operation,
      'has_auth', auth.uid() IS NOT NULL,
      'session_valid', validate_session_token_header() IS NOT NULL
    )
  );
  
  -- Always require authentication for sensitive tables
  IF table_name IN ('profiles', 'subscribers', 'security_audit_log', 'login_attempts') THEN
    RETURN auth.uid() IS NOT NULL;
  END IF;
  
  -- For other tables, allow with valid session or auth
  RETURN auth.uid() IS NOT NULL OR validate_session_token_header() IS NOT NULL;
END;
$$;

-- 7. Add audit trigger for all sensitive table access
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'subscribers', 'device_sessions') THEN
    PERFORM log_security_event(
      TG_OP || '_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'operation', TG_OP,
        'user_authenticated', auth.uid() IS NOT NULL
      )
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_access ON public.profiles;
CREATE TRIGGER audit_profiles_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_table_access();

DROP TRIGGER IF EXISTS audit_subscribers_access ON public.subscribers;
CREATE TRIGGER audit_subscribers_access
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_table_access();

-- 8. Create function to validate admin access
CREATE OR REPLACE FUNCTION public.validate_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL AND public.is_admin();
END;
$$;
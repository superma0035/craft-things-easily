-- ==========================================
-- ENHANCED RLS POLICIES FOR EXISTING TABLES
-- ==========================================

-- 1. DROP OLD POLICIES AND CREATE NEW SECURE ONES FOR RESTAURANTS
DROP POLICY IF EXISTS "Restaurant owners can delete their own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can insert their own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can delete own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can insert own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can update own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can view own restaurants" ON public.restaurants;

-- Simplified restaurant policies
CREATE POLICY "Owners can manage own restaurants"
ON public.restaurants FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 2. UPDATE PROFILES POLICIES (prevent deletion, add rate limiting)
DROP POLICY IF EXISTS "Profiles cannot be deleted" ON public.profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their own profile with rate limit" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "No anonymous access to profiles" ON public.profiles;

-- Profiles: users can only manage their own
CREATE POLICY "Users manage own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile with rate limit"
ON public.profiles FOR UPDATE
USING (id = auth.uid() AND auth.uid() IS NOT NULL AND check_profile_update_rate_limit())
WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

-- Prevent profile deletion
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles FOR DELETE
USING (false);

-- 3. ENHANCED SUBSCRIBERS POLICIES
DROP POLICY IF EXISTS "Subscriber can update own subscription only" ON public.subscribers;
DROP POLICY IF EXISTS "Subscriber can view own subscription data only" ON public.subscribers;
DROP POLICY IF EXISTS "System can insert subscription data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can only update own subscription data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can only view own subscription data" ON public.subscribers;

-- Users can view and update own subscription
CREATE POLICY "Users manage own subscription"
ON public.subscribers FOR SELECT
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users update own subscription"
ON public.subscribers FOR UPDATE
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL)
WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Service role can insert for webhooks
CREATE POLICY "Service role can insert subscriptions"
ON public.subscribers FOR INSERT
WITH CHECK (true);

-- 4. ENHANCED ORDERS POLICIES
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Valid session holders can place orders" ON public.orders;
DROP POLICY IF EXISTS "Valid sessions can view orders" ON public.orders;

-- Restaurant owners can manage orders
CREATE POLICY "Owners manage restaurant orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = orders.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners update restaurant orders"
ON public.orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = orders.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Valid sessions can create and view orders
CREATE POLICY "Valid sessions create orders"
ON public.orders FOR INSERT
WITH CHECK (
  validate_session_token_header() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.device_sessions ds
    WHERE ds.restaurant_id = orders.restaurant_id
    AND ds.table_number = orders.table_number
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

CREATE POLICY "Valid sessions view own orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.device_sessions ds
    WHERE ds.restaurant_id = orders.restaurant_id
    AND ds.table_number = orders.table_number
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

-- 5. ENHANCED ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Users can view order items of own restaurants" ON public.order_items;
DROP POLICY IF EXISTS "Valid session holders can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Valid sessions can view order items" ON public.order_items;

CREATE POLICY "Owners view restaurant order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.id = order_items.order_id
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Valid sessions create order items"
ON public.order_items FOR INSERT
WITH CHECK (
  validate_session_token_header() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.device_sessions ds ON (
      ds.restaurant_id = o.restaurant_id 
      AND ds.table_number = o.table_number
    )
    WHERE o.id = order_items.order_id
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

CREATE POLICY "Valid sessions view own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.device_sessions ds ON (
      ds.restaurant_id = o.restaurant_id 
      AND ds.table_number = o.table_number
    )
    WHERE o.id = order_items.order_id
    AND ds.session_token = validate_session_token_header()
    AND ds.expires_at > now()
  )
);

-- 6. ENHANCED DEVICE SESSIONS POLICIES
DROP POLICY IF EXISTS "Controlled device session creation" ON public.device_sessions;
DROP POLICY IF EXISTS "Customers can delete own device session by token" ON public.device_sessions;
DROP POLICY IF EXISTS "Customers can update own device session by token" ON public.device_sessions;
DROP POLICY IF EXISTS "Owners can delete device sessions for their restaurants" ON public.device_sessions;
DROP POLICY IF EXISTS "Owners can update device sessions for their restaurants" ON public.device_sessions;
DROP POLICY IF EXISTS "Owners can view device sessions for their restaurants" ON public.device_sessions;
DROP POLICY IF EXISTS "Strict device session access" ON public.device_sessions;

-- Rate-limited session creation
CREATE POLICY "Controlled session creation"
ON public.device_sessions FOR INSERT
WITH CHECK (
  session_token IS NOT NULL
  AND length(session_token) > 20
  AND validate_session_token(session_token)
  AND check_session_rate_limit(device_ip)
  AND restaurant_id IS NOT NULL
  AND table_number IS NOT NULL
);

-- Users manage own sessions
CREATE POLICY "Users manage own sessions"
ON public.device_sessions FOR SELECT
USING (
  session_token = validate_session_token_header()
  AND expires_at > now()
);

CREATE POLICY "Users update own sessions"
ON public.device_sessions FOR UPDATE
USING (session_token = validate_session_token_header());

CREATE POLICY "Users delete own sessions"
ON public.device_sessions FOR DELETE
USING (session_token = validate_session_token_header());

-- Owners manage restaurant sessions
CREATE POLICY "Owners manage restaurant sessions"
ON public.device_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = device_sessions.restaurant_id
    AND r.owner_id = auth.uid()
  )
);

-- 7. AUTOMATIC CLEANUP CRON JOB FUNCTION
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM public.device_sessions 
  WHERE expires_at < now() - interval '1 hour';
  
  -- Delete old login attempts (keep 30 days)
  DELETE FROM public.login_attempts 
  WHERE attempted_at < now() - interval '30 days';
  
  -- Delete old audit logs (keep 90 days)
  DELETE FROM public.security_audit_log 
  WHERE created_at < now() - interval '90 days';
  
  -- Log cleanup
  PERFORM log_security_event('automated_cleanup', NULL, NULL, 
    jsonb_build_object('timestamp', now()));
END;
$$;
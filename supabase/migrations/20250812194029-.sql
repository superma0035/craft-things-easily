-- Fix critical security vulnerability: Orders table publicly accessible
-- Remove the overly permissive policy that allows public access to all orders
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;

-- Create secure policies for orders table
-- 1. Restaurant owners can view all orders for their restaurants
CREATE POLICY "Restaurant owners can view their restaurant orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = orders.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

-- 2. Restaurant owners can update orders for their restaurants (status changes)
CREATE POLICY "Restaurant owners can update their restaurant orders" 
ON public.orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = orders.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

-- 3. Allow customers to place orders (INSERT) - anyone can create orders
-- This is needed for QR code ordering where customers aren't authenticated
CREATE POLICY "Anyone can place orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- 4. Customers can view orders for their specific session/table
-- This allows customers to see orders they placed from their table session
CREATE POLICY "Customers can view orders from their table session" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.device_sessions 
    WHERE device_sessions.restaurant_id = orders.restaurant_id 
    AND device_sessions.table_number = orders.table_number
    AND device_sessions.session_token = current_setting('request.headers')::json->>'x-session-token'
    AND device_sessions.expires_at > now()
  )
);

-- Note: The session token policy above may need adjustment based on how session tokens are passed
-- For now, we'll ensure restaurant owners have full control and customers can place orders
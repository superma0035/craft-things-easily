-- Fix RLS policies for orders to allow anonymous users to place orders

-- Drop existing conflicting policies and recreate them properly
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders of own restaurants" ON public.orders;
DROP POLICY IF EXISTS "Users can update orders of own restaurants" ON public.orders;

-- Allow anyone (including anonymous users) to insert orders
CREATE POLICY "Allow public order creation" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Allow restaurant owners to view their restaurant's orders
CREATE POLICY "Restaurant owners can view their orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = orders.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

-- Allow restaurant owners to update their restaurant's orders
CREATE POLICY "Restaurant owners can update their orders" 
ON public.orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = orders.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);
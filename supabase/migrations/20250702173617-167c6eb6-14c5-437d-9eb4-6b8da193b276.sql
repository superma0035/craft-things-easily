-- Create subscribers table for subscription management
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers table
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger for subscribers
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for restaurant assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for restaurant assets
CREATE POLICY "Restaurant assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Authenticated users can upload restaurant assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'restaurant-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own restaurant assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'restaurant-assets' AND auth.uid() IS NOT NULL);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id_created_at ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id_available ON public.menu_items (restaurant_id) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id_active ON public.tables (restaurant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers (user_id);

-- Add proper foreign key constraints with proper references
ALTER TABLE public.menu_items 
ADD CONSTRAINT fk_menu_items_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.menu_items 
ADD CONSTRAINT fk_menu_items_category 
FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;

ALTER TABLE public.menu_categories 
ADD CONSTRAINT fk_menu_categories_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.tables 
ADD CONSTRAINT fk_tables_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
ADD CONSTRAINT fk_orders_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
ADD CONSTRAINT fk_orders_table 
FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE SET NULL;

ALTER TABLE public.order_items 
ADD CONSTRAINT fk_order_items_order 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items 
ADD CONSTRAINT fk_order_items_menu_item 
FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;
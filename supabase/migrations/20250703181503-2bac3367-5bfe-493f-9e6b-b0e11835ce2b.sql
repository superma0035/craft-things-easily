-- Create public access policies for QR code scanning

-- Allow public access to restaurant data for QR code scanning
CREATE POLICY "Allow public access to restaurant info for QR scanning" 
ON public.restaurants 
FOR SELECT 
USING (true);

-- Allow public access to menu items for QR code scanning
CREATE POLICY "Allow public access to menu items for QR scanning" 
ON public.menu_items 
FOR SELECT 
USING (true);

-- Allow public access to menu categories for QR code scanning
CREATE POLICY "Allow public access to menu categories for QR scanning" 
ON public.menu_categories 
FOR SELECT 
USING (true);
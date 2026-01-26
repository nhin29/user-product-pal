-- Drop existing authenticated-only insert policy for products
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;

-- Create public insert policy for products (matching development accessibility settings)
CREATE POLICY "Anyone can insert products"
ON public.products
FOR INSERT
TO public
WITH CHECK (true);
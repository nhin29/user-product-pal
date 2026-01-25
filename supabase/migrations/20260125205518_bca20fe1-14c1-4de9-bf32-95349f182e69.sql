-- Add UPDATE policy for products
CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add DELETE policy for products
CREATE POLICY "Authenticated users can delete products"
ON public.products FOR DELETE
USING (true);
-- Add INSERT, UPDATE, DELETE policies for categories
CREATE POLICY "Authenticated users can insert categories"
ON public.categories FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.categories FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
ON public.categories FOR DELETE
USING (true);

-- Add INSERT, UPDATE, DELETE policies for product_types
CREATE POLICY "Authenticated users can insert product_types"
ON public.product_types FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update product_types"
ON public.product_types FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product_types"
ON public.product_types FOR DELETE
USING (true);
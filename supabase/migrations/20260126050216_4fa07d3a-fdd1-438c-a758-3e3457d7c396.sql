
-- Drop existing authenticated-only policies for product-images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Create public access policies for product-images (matching category-icons pattern)
CREATE POLICY "Public upload access to product images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Public update access to product images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Public delete access to product images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'product-images');

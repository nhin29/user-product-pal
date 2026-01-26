-- Update the product-images bucket to allow larger files (100MB limit, or set to NULL for no limit)
UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'product-images';

-- Add image_urls column as text array
ALTER TABLE public.products ADD COLUMN image_urls text[] NOT NULL DEFAULT '{}';

-- Migrate existing image_url data into image_urls as single-element arrays
UPDATE public.products SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url != '';

-- Drop the old image_url column
ALTER TABLE public.products DROP COLUMN image_url;

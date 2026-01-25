-- Add the icon column to the categories table
ALTER TABLE public.categories
ADD COLUMN icon TEXT;

-- Create a bucket for category icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('category-icons', 'category-icons', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']);

-- Create RLS policies for the bucket
CREATE POLICY "Public read access to category icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-icons');

CREATE POLICY "Authenticated upload access to category icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-icons');

CREATE POLICY "Authenticated update access to category icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-icons');

CREATE POLICY "Authenticated delete access to category icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-icons');
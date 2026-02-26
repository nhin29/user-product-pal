
-- Create product_images table
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  niche_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Product images are viewable by everyone"
ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert product images"
ON public.product_images FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update product images"
ON public.product_images FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product images"
ON public.product_images FOR DELETE USING (true);

-- Index for fast lookups
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_niche_id ON public.product_images(niche_id);

-- Migrate existing data: each URL in image_urls becomes a row, using the product's product_type_id as niche
INSERT INTO public.product_images (product_id, niche_id, image_url, display_order)
SELECT
  p.id,
  p.product_type_id,
  unnest_url,
  (row_number() OVER (PARTITION BY p.id ORDER BY ord)) - 1
FROM products p,
LATERAL unnest(p.image_urls) WITH ORDINALITY AS t(unnest_url, ord)
WHERE array_length(p.image_urls, 1) > 0;

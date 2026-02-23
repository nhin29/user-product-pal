-- Add composite index for the products query ordering
CREATE INDEX IF NOT EXISTS idx_products_display_order_created_at 
ON public.products (display_order ASC NULLS LAST, created_at ASC);

-- Add index for common filter columns
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type_id ON public.products (product_type_id);
CREATE INDEX IF NOT EXISTS idx_products_platform ON public.products (platform);
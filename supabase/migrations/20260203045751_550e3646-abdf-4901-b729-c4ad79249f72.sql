-- Add display_order column to products for custom ordering
ALTER TABLE public.products ADD COLUMN display_order integer DEFAULT 0;

-- Set initial order based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.products
)
UPDATE public.products p
SET display_order = n.rn
FROM numbered n
WHERE p.id = n.id;
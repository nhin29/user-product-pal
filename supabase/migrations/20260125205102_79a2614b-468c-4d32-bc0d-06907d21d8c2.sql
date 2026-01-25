-- First, we need to handle the foreign key constraint
-- Temporarily remove the NOT NULL constraint
ALTER TABLE public.products ALTER COLUMN category_id DROP NOT NULL;

-- Set existing products' category_id to NULL
UPDATE public.products SET category_id = NULL;

-- Delete all existing categories
DELETE FROM public.categories;

-- Insert new categories based on the provided list
INSERT INTO public.categories (name, slug, description) VALUES
  ('Hero images', 'hero-images', 'Main banner and hero section images'),
  ('How to process', 'how-to-process', 'Step-by-step process visualizations'),
  ('Multi feature grid', 'multi-feature-grid', '4x4 or grid-based feature displays'),
  ('Lifestyle', 'lifestyle', 'Product in real-life context'),
  ('Split screen', 'split-screen', 'Before/after or comparison layouts'),
  ('Info graphic', 'info-graphic', 'Information-rich visual displays'),
  ('Product photos', 'product-photos', 'Clean product photography');

-- Update products to use the new Lifestyle category for those that had it
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE c.slug = 'product-photos';

-- Restore NOT NULL constraint
ALTER TABLE public.products ALTER COLUMN category_id SET NOT NULL;
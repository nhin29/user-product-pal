-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are viewable by everyone
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

-- Insert existing categories from products
INSERT INTO public.categories (name, slug)
SELECT DISTINCT category, lower(replace(category, ' ', '-'))
FROM public.products
WHERE category IS NOT NULL;

-- Add category_id column to products
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Update products with category_id based on existing category text
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category = c.name;

-- Make category_id NOT NULL after populating
ALTER TABLE public.products ALTER COLUMN category_id SET NOT NULL;

-- Drop the old category text column
ALTER TABLE public.products DROP COLUMN category;
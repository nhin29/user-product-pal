-- Add made_by and note columns to products table
ALTER TABLE public.products 
ADD COLUMN made_by text,
ADD COLUMN note text;
-- Make category_id nullable since video platform products don't need a category
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;

-- Update existing video products: change platform to 'video'
UPDATE products 
SET platform = 'video' 
WHERE category_id = '67caedbb-e570-4fdd-925d-d03a02e1b4d6';
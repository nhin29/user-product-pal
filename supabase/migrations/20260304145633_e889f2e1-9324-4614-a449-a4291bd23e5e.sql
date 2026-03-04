-- Remove category reference from video products
UPDATE products SET category_id = NULL WHERE category_id = '67caedbb-e570-4fdd-925d-d03a02e1b4d6';

-- Delete the Video category
DELETE FROM categories WHERE id = '67caedbb-e570-4fdd-925d-d03a02e1b4d6';
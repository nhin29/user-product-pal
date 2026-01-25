-- Update existing product_types to niche categories
-- First update the ones that are being used by products
UPDATE product_types SET name = 'Pet', slug = 'pet', description = 'Pet products and accessories' WHERE slug = 'product-photos';
UPDATE product_types SET name = 'Health', slug = 'health', description = 'Health and wellness products' WHERE slug = 'lifestyle';
UPDATE product_types SET name = 'Beauty', slug = 'beauty', description = 'Beauty and skincare products' WHERE slug = 'multi-feature-grid';
UPDATE product_types SET name = 'Home', slug = 'home', description = 'Home and living products' WHERE slug = 'hero-images';
UPDATE product_types SET name = 'Tech', slug = 'tech', description = 'Technology and electronics' WHERE slug = 'how-to-process';
UPDATE product_types SET name = 'Fashion', slug = 'fashion', description = 'Clothing and fashion accessories' WHERE slug = 'info-graphic';
UPDATE product_types SET name = 'Food', slug = 'food', description = 'Food and beverage products' WHERE slug = 'split-screen';

-- Insert additional niches
INSERT INTO product_types (name, slug, description) VALUES
  ('Sports', 'sports', 'Sports and fitness equipment'),
  ('Baby', 'baby', 'Baby and kids products'),
  ('Outdoor', 'outdoor', 'Outdoor and garden products');
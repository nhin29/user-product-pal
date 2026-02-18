-- Move all products from "Before & After" to "Comparison Table"
UPDATE products 
SET category_id = '3cc81891-ef05-491a-b8ff-99b6c6714250' 
WHERE category_id = '5c2eeae6-1430-43d4-b427-04e407f6f886';

-- Delete the "Before & After" category
DELETE FROM categories WHERE id = '5c2eeae6-1430-43d4-b427-04e407f6f886';
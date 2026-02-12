-- Move all products from "Benefits List" to "Infographic" category
UPDATE public.products SET category_id = 'd8f75ba0-a7b6-4756-b702-b5c9d9d69823' WHERE category_id = 'd2d513fe-530e-470c-a55f-f5a03fc934e2';

-- Delete the "Benefits List" category
DELETE FROM public.categories WHERE id = 'd2d513fe-530e-470c-a55f-f5a03fc934e2';
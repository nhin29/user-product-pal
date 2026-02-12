-- Duplicate all Amazon products as Shopify products
INSERT INTO public.products (category_id, description, image_url, prompt, platform, product_type_id, made_by, note, display_order)
SELECT category_id, description, image_url, prompt, 'shopify', product_type_id, made_by, note, 
       display_order + (SELECT COALESCE(MAX(display_order), 0) FROM products)
FROM products
WHERE platform = 'amazon'
ORDER BY display_order ASC;
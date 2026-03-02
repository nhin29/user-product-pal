-- Step 1: Duplicate all Shopify products as WooCommerce
-- Use a temp table to map old IDs to new IDs
DO $$
DECLARE
  rec RECORD;
  new_id uuid;
  max_order int;
  counter int := 0;
BEGIN
  -- Get current max display_order
  SELECT COALESCE(MAX(display_order), 0) INTO max_order FROM products;

  FOR rec IN
    SELECT * FROM products WHERE platform = 'shopify' ORDER BY display_order ASC
  LOOP
    counter := counter + 1;
    new_id := gen_random_uuid();

    INSERT INTO products (id, category_id, product_type_id, platform, prompt, description, note, made_by, is_admin, image_urls, display_order)
    VALUES (
      new_id,
      rec.category_id,
      rec.product_type_id,
      'woo',
      rec.prompt,
      rec.description,
      rec.note,
      rec.made_by,
      rec.is_admin,
      rec.image_urls,
      max_order + counter
    );

    -- Duplicate product_images
    INSERT INTO product_images (product_id, niche_id, image_url, display_order)
    SELECT new_id, niche_id, image_url, display_order
    FROM product_images
    WHERE product_id = rec.id;
  END LOOP;
END $$;
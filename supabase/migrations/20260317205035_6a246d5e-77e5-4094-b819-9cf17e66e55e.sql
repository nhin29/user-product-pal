
ALTER TABLE public.generated_images
  DROP CONSTRAINT generated_images_product_id_fkey;

ALTER TABLE public.generated_images
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.generated_images
  ADD CONSTRAINT generated_images_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE SET NULL;

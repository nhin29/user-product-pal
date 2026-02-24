
DROP FUNCTION IF EXISTS public.get_top_products_by_interaction(text, integer);

CREATE OR REPLACE FUNCTION public.get_top_products_by_interaction(p_interaction_type text, p_limit integer DEFAULT 5)
 RETURNS TABLE(product_id uuid, image_url text, interaction_count bigint, category_name text, platform text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    sub.product_id,
    (SELECT p.image_urls[1] FROM products p WHERE p.id = sub.product_id) AS image_url,
    sub.interaction_count,
    (SELECT c.name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = sub.product_id) AS category_name,
    (SELECT p.platform FROM products p WHERE p.id = sub.product_id) AS platform
  FROM (
    SELECT pi.product_id, count(*) AS interaction_count
    FROM prompt_interactions pi
    WHERE pi.interaction_type = p_interaction_type AND p_interaction_type != 'save'
    GROUP BY pi.product_id
    UNION ALL
    SELECT b.product_id, count(*) AS interaction_count
    FROM bookmarks b
    WHERE p_interaction_type = 'save'
    GROUP BY b.product_id
  ) sub
  ORDER BY sub.interaction_count DESC
  LIMIT p_limit;
$function$;

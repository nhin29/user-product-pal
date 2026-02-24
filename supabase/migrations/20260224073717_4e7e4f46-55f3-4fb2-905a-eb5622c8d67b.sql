
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_users bigint, total_products bigint, total_categories bigint, total_product_types bigint, total_clicks bigint, total_copies bigint, total_saves bigint, total_generations bigint, avg_spend_time_seconds bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT count(*) FROM profiles) AS total_users,
    (SELECT count(*) FROM products) AS total_products,
    (SELECT count(*) FROM categories) AS total_categories,
    (SELECT count(*) FROM product_types) AS total_product_types,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'click') AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'copy') AS total_copies,
    (SELECT count(*) FROM bookmarks) AS total_saves,
    (SELECT count(*) FROM generated_images) AS total_generations,
    (SELECT COALESCE(AVG(total_seconds), 0)::bigint FROM daily_time_tracking) AS avg_spend_time_seconds;
$function$;

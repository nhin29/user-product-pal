
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_users bigint, total_products bigint, total_categories bigint, total_product_types bigint, total_clicks bigint, total_copies bigint, total_saves bigint, total_generations bigint, avg_spend_time_seconds bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH analytics_users AS (
    SELECT user_id FROM profiles WHERE is_analytics = true
  )
  SELECT
    (SELECT count(*) FROM profiles WHERE is_analytics = true) AS total_users,
    (SELECT count(*) FROM products) AS total_products,
    (SELECT count(*) FROM categories) AS total_categories,
    (SELECT count(*) FROM product_types) AS total_product_types,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'click' AND (user_id IS NULL OR user_id IN (SELECT user_id FROM analytics_users))) AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'copy' AND (user_id IS NULL OR user_id IN (SELECT user_id FROM analytics_users))) AS total_copies,
    (SELECT count(*) FROM bookmarks WHERE user_id IN (SELECT user_id FROM analytics_users)) AS total_saves,
    (SELECT count(*) FROM generated_images WHERE user_id IN (SELECT user_id FROM analytics_users)) AS total_generations,
    (SELECT COALESCE(AVG(total_seconds), 0)::bigint FROM daily_time_tracking WHERE user_id IN (SELECT user_id FROM analytics_users)) AS avg_spend_time_seconds;
$function$;

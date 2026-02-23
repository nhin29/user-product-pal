
DROP FUNCTION IF EXISTS public.get_user_analytics_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_user_analytics_stats(p_user_id uuid)
 RETURNS TABLE(total_clicks bigint, total_copies bigint, total_saves bigint, total_page_views bigint, total_events bigint, total_generations bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'click') AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'copy') AS total_copies,
    (SELECT count(*) FROM bookmarks WHERE user_id = p_user_id) AS total_saves,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id AND (event_type = 'navigation' OR event_type = 'pageview')) AS total_page_views,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id) AS total_events,
    (SELECT count(*) FROM generated_images WHERE user_id = p_user_id) AS total_generations;
$$;

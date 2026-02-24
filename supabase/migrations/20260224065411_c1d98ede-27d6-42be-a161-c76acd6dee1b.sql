DROP FUNCTION IF EXISTS public.get_user_chart_data(uuid, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_user_chart_data(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(day date, clicks bigint, copies bigint, saves bigint, page_views bigint, generations bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS day
  ),
  interaction_agg AS (
    SELECT
      created_at::date AS day,
      count(*) FILTER (WHERE interaction_type = 'click') AS clicks,
      count(*) FILTER (WHERE interaction_type = 'copy') AS copies
    FROM prompt_interactions
    WHERE user_id = p_user_id AND created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  bookmark_agg AS (
    SELECT
      created_at::date AS day,
      count(*) AS saves
    FROM bookmarks
    WHERE user_id = p_user_id AND created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  event_agg AS (
    SELECT
      created_at::date AS day,
      count(*) FILTER (WHERE event_type = 'navigation' OR event_type = 'pageview') AS page_views
    FROM analytics_events
    WHERE user_id = p_user_id AND created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  generation_agg AS (
    SELECT
      created_at::date AS day,
      count(*) AS generations
    FROM generated_images
    WHERE user_id = p_user_id AND created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  )
  SELECT
    ds.day,
    COALESCE(ia.clicks, 0) AS clicks,
    COALESCE(ia.copies, 0) AS copies,
    COALESCE(ba.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ga.generations, 0) AS generations
  FROM date_series ds
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN bookmark_agg ba ON ds.day = ba.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  LEFT JOIN generation_agg ga ON ds.day = ga.day
  ORDER BY ds.day;
$$;
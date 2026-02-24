
DROP FUNCTION IF EXISTS public.get_dashboard_chart_data(timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_dashboard_chart_data(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(day date, new_customers bigint, repeat_customers bigint, copies bigint, saves bigint, page_views bigint, generations bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH date_series AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS day
  ),
  customer_agg AS (
    SELECT created_at::date AS day, count(*) AS new_customers
    FROM profiles
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  repeat_customer_agg AS (
    SELECT dt.date AS day, count(DISTINCT dt.user_id) AS repeat_customers
    FROM daily_time_tracking dt
    WHERE dt.date >= p_start_date::date AND dt.date <= p_end_date::date
      AND EXISTS (
        SELECT 1 FROM daily_time_tracking prev
        WHERE prev.user_id = dt.user_id AND prev.date < dt.date
      )
    GROUP BY dt.date
  ),
  interaction_agg AS (
    SELECT created_at::date AS day,
      count(*) FILTER (WHERE interaction_type = 'copy') AS copies
    FROM prompt_interactions
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  bookmark_agg AS (
    SELECT created_at::date AS day, count(*) AS saves
    FROM bookmarks
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  event_agg AS (
    SELECT created_at::date AS day,
      count(*) FILTER (WHERE event_type = 'navigation' OR event_type = 'pageview') AS page_views
    FROM analytics_events
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  generation_agg AS (
    SELECT created_at::date AS day, count(*) AS generations
    FROM generated_images
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  )
  SELECT
    ds.day,
    COALESCE(ca.new_customers, 0) AS new_customers,
    COALESCE(rc.repeat_customers, 0) AS repeat_customers,
    COALESCE(ia.copies, 0) AS copies,
    COALESCE(ba.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ga.generations, 0) AS generations
  FROM date_series ds
  LEFT JOIN customer_agg ca ON ds.day = ca.day
  LEFT JOIN repeat_customer_agg rc ON ds.day = rc.day
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN bookmark_agg ba ON ds.day = ba.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  LEFT JOIN generation_agg ga ON ds.day = ga.day
  ORDER BY ds.day;
$function$;

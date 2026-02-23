
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_users bigint, total_products bigint, total_categories bigint, total_product_types bigint, total_clicks bigint, total_copies bigint, total_saves bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM profiles) AS total_users,
    (SELECT count(*) FROM products) AS total_products,
    (SELECT count(*) FROM categories) AS total_categories,
    (SELECT count(*) FROM product_types) AS total_product_types,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'click') AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'copy') AS total_copies,
    (SELECT count(*) FROM bookmarks) AS total_saves;
$$;

CREATE OR REPLACE FUNCTION public.get_user_analytics_stats(p_user_id uuid)
 RETURNS TABLE(total_clicks bigint, total_copies bigint, total_saves bigint, total_page_views bigint, total_events bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'click') AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'copy') AS total_copies,
    (SELECT count(*) FROM bookmarks WHERE user_id = p_user_id) AS total_saves,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id AND (event_type = 'navigation' OR event_type = 'pageview')) AS total_page_views,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id) AS total_events;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_chart_data(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(day date, clicks bigint, copies bigint, saves bigint, page_views bigint, events bigint)
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
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  bookmark_agg AS (
    SELECT
      created_at::date AS day,
      count(*) AS saves
    FROM bookmarks
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  ),
  event_agg AS (
    SELECT
      created_at::date AS day,
      count(*) AS events,
      count(*) FILTER (WHERE event_type = 'navigation' OR event_type = 'pageview') AS page_views
    FROM analytics_events
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  )
  SELECT
    ds.day,
    COALESCE(ia.clicks, 0) AS clicks,
    COALESCE(ia.copies, 0) AS copies,
    COALESCE(ba.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ea.events, 0) AS events
  FROM date_series ds
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN bookmark_agg ba ON ds.day = ba.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  ORDER BY ds.day;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chart_data(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(day date, clicks bigint, copies bigint, saves bigint, page_views bigint, events bigint)
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
      count(*) AS events,
      count(*) FILTER (WHERE event_type = 'navigation' OR event_type = 'pageview') AS page_views
    FROM analytics_events
    WHERE user_id = p_user_id AND created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY created_at::date
  )
  SELECT
    ds.day,
    COALESCE(ia.clicks, 0) AS clicks,
    COALESCE(ia.copies, 0) AS copies,
    COALESCE(ba.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ea.events, 0) AS events
  FROM date_series ds
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN bookmark_agg ba ON ds.day = ba.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  ORDER BY ds.day;
$$;

CREATE OR REPLACE FUNCTION public.get_top_products_by_interaction(p_interaction_type text, p_limit integer DEFAULT 5)
 RETURNS TABLE(product_id uuid, image_url text, interaction_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    sub.product_id,
    (SELECT p.image_urls[1] FROM products p WHERE p.id = sub.product_id) AS image_url,
    sub.interaction_count
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
$$;

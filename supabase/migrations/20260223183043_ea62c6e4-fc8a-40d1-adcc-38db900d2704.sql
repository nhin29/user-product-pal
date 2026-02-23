
-- 1. Dashboard chart aggregation (all users, grouped by date)
CREATE OR REPLACE FUNCTION public.get_dashboard_chart_data(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE(
  day date,
  clicks bigint,
  copies bigint,
  saves bigint,
  page_views bigint,
  events bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS day
  ),
  interaction_agg AS (
    SELECT
      created_at::date AS day,
      count(*) FILTER (WHERE interaction_type = 'click') AS clicks,
      count(*) FILTER (WHERE interaction_type = 'copy') AS copies,
      count(*) FILTER (WHERE interaction_type = 'save') AS saves
    FROM prompt_interactions
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
    COALESCE(ia.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ea.events, 0) AS events
  FROM date_series ds
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  ORDER BY ds.day;
$$;

-- 2. User-specific chart aggregation
CREATE OR REPLACE FUNCTION public.get_user_chart_data(p_user_id uuid, p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE(
  day date,
  clicks bigint,
  copies bigint,
  saves bigint,
  page_views bigint,
  events bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS day
  ),
  interaction_agg AS (
    SELECT
      created_at::date AS day,
      count(*) FILTER (WHERE interaction_type = 'click') AS clicks,
      count(*) FILTER (WHERE interaction_type = 'copy') AS copies,
      count(*) FILTER (WHERE interaction_type = 'save') AS saves
    FROM prompt_interactions
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
    COALESCE(ia.saves, 0) AS saves,
    COALESCE(ea.page_views, 0) AS page_views,
    COALESCE(ea.events, 0) AS events
  FROM date_series ds
  LEFT JOIN interaction_agg ia ON ds.day = ia.day
  LEFT JOIN event_agg ea ON ds.day = ea.day
  ORDER BY ds.day;
$$;

-- 3. Top products by interaction type
CREATE OR REPLACE FUNCTION public.get_top_products_by_interaction(p_interaction_type text, p_limit integer DEFAULT 5)
RETURNS TABLE(
  product_id uuid,
  image_url text,
  interaction_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pi.product_id,
    (SELECT p.image_urls[1] FROM products p WHERE p.id = pi.product_id) AS image_url,
    count(*) AS interaction_count
  FROM prompt_interactions pi
  WHERE pi.interaction_type = p_interaction_type
  GROUP BY pi.product_id
  ORDER BY interaction_count DESC
  LIMIT p_limit;
$$;

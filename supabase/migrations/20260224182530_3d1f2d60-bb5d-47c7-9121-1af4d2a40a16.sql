-- Remove ambiguous overloaded function causing PGRST203
DROP FUNCTION IF EXISTS public.get_dashboard_chart_data(timestamp with time zone, timestamp with time zone);

-- Canonical dashboard chart function (text params) filtered to analytics-enabled users only
CREATE OR REPLACE FUNCTION public.get_dashboard_chart_data(p_start_date text, p_end_date text)
RETURNS TABLE(
  day date,
  new_customers bigint,
  repeat_customers bigint,
  copies bigint,
  saves bigint,
  page_views bigint,
  generations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH analytics_users AS (
    SELECT user_id FROM profiles WHERE is_analytics = true
  ),
  date_series AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS day
  ),
  customer_agg AS (
    SELECT created_at::date AS day, count(*) AS new_customers
    FROM profiles
    WHERE created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
      AND is_analytics = true
    GROUP BY created_at::date
  ),
  repeat_customer_agg AS (
    SELECT dt.date AS day, count(DISTINCT dt.user_id) AS repeat_customers
    FROM daily_time_tracking dt
    WHERE dt.date >= p_start_date::date
      AND dt.date <= p_end_date::date
      AND dt.user_id IN (SELECT user_id FROM analytics_users)
      AND EXISTS (
        SELECT 1
        FROM daily_time_tracking prev
        WHERE prev.user_id = dt.user_id
          AND prev.date < dt.date
      )
    GROUP BY dt.date
  ),
  interaction_agg AS (
    SELECT created_at::date AS day,
      count(*) FILTER (WHERE interaction_type = 'copy') AS copies
    FROM prompt_interactions
    WHERE created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
      AND user_id IN (SELECT user_id FROM analytics_users)
    GROUP BY created_at::date
  ),
  bookmark_agg AS (
    SELECT created_at::date AS day, count(*) AS saves
    FROM bookmarks
    WHERE created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
      AND user_id IN (SELECT user_id FROM analytics_users)
    GROUP BY created_at::date
  ),
  event_agg AS (
    SELECT created_at::date AS day,
      count(*) FILTER (WHERE event_type = 'navigation' OR event_type = 'pageview') AS page_views
    FROM analytics_events
    WHERE created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
      AND user_id IN (SELECT user_id FROM analytics_users)
    GROUP BY created_at::date
  ),
  generation_agg AS (
    SELECT created_at::date AS day, count(*) AS generations
    FROM generated_images
    WHERE created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
      AND user_id IN (SELECT user_id FROM analytics_users)
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

-- Ensure dashboard summary stats are strictly analytics-enabled users only
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  total_products bigint,
  total_categories bigint,
  total_product_types bigint,
  total_clicks bigint,
  total_copies bigint,
  total_saves bigint,
  total_generations bigint,
  avg_spend_time_seconds bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'click' AND user_id IN (SELECT user_id FROM analytics_users)) AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'copy' AND user_id IN (SELECT user_id FROM analytics_users)) AS total_copies,
    (SELECT count(*) FROM bookmarks WHERE user_id IN (SELECT user_id FROM analytics_users)) AS total_saves,
    (SELECT count(*) FROM generated_images WHERE user_id IN (SELECT user_id FROM analytics_users)) AS total_generations,
    (SELECT COALESCE(AVG(total_seconds), 0)::bigint FROM daily_time_tracking WHERE user_id IN (SELECT user_id FROM analytics_users)) AS avg_spend_time_seconds;
$function$;

-- Ensure top products are strictly analytics-enabled users only
CREATE OR REPLACE FUNCTION public.get_top_products_by_interaction(p_interaction_type text, p_limit integer DEFAULT 5)
RETURNS TABLE(
  product_id uuid,
  image_url text,
  interaction_count bigint,
  category_name text,
  platform text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH analytics_users AS (
    SELECT user_id FROM profiles WHERE is_analytics = true
  )
  SELECT
    sub.product_id,
    (SELECT p.image_urls[1] FROM products p WHERE p.id = sub.product_id) AS image_url,
    sub.interaction_count,
    (SELECT c.name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = sub.product_id) AS category_name,
    (SELECT p.platform FROM products p WHERE p.id = sub.product_id) AS platform
  FROM (
    SELECT pi.product_id, count(*) AS interaction_count
    FROM prompt_interactions pi
    WHERE pi.interaction_type = p_interaction_type
      AND p_interaction_type != 'save'
      AND pi.user_id IN (SELECT user_id FROM analytics_users)
    GROUP BY pi.product_id

    UNION ALL

    SELECT b.product_id, count(*) AS interaction_count
    FROM bookmarks b
    WHERE p_interaction_type = 'save'
      AND b.user_id IN (SELECT user_id FROM analytics_users)
    GROUP BY b.product_id
  ) sub
  ORDER BY sub.interaction_count DESC
  LIMIT p_limit;
$function$;
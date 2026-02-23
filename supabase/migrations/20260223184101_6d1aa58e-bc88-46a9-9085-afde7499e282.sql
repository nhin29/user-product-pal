
-- RPC to get dashboard stats (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  total_products bigint,
  total_categories bigint,
  total_product_types bigint,
  total_clicks bigint,
  total_copies bigint,
  total_saves bigint
)
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
    (SELECT count(*) FROM prompt_interactions WHERE interaction_type = 'save') AS total_saves;
$$;

-- RPC to get user-specific analytics stats (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_analytics_stats(p_user_id uuid)
RETURNS TABLE(
  total_clicks bigint,
  total_copies bigint,
  total_saves bigint,
  total_page_views bigint,
  total_events bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'click') AS total_clicks,
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'copy') AS total_copies,
    (SELECT count(*) FROM prompt_interactions WHERE user_id = p_user_id AND interaction_type = 'save') AS total_saves,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id AND (event_type = 'navigation' OR event_type = 'pageview')) AS total_page_views,
    (SELECT count(*) FROM analytics_events WHERE user_id = p_user_id) AS total_events;
$$;

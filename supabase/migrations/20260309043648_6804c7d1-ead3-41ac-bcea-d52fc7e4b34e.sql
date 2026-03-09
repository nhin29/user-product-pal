
-- 1. RPC: get_last_seen_by_users - returns last analytics event per user
CREATE OR REPLACE FUNCTION public.get_last_seen_by_users(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_seen timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (ae.user_id)
    ae.user_id,
    ae.created_at AS last_seen
  FROM analytics_events ae
  WHERE ae.user_id = ANY(p_user_ids)
  ORDER BY ae.user_id, ae.created_at DESC;
$$;

-- 2. RPC: get_power_user_ids - returns user_ids with copies+generations > threshold
CREATE OR REPLACE FUNCTION public.get_power_user_ids(p_threshold integer DEFAULT 10)
RETURNS TABLE(user_id uuid, total_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sub.user_id, sub.total_count
  FROM (
    SELECT user_id, count(*) AS total_count
    FROM (
      SELECT user_id FROM prompt_interactions WHERE interaction_type = 'copy' AND user_id IS NOT NULL
      UNION ALL
      SELECT user_id FROM generated_images WHERE user_id IS NOT NULL
    ) combined
    GROUP BY user_id
    HAVING count(*) > p_threshold
  ) sub;
$$;

-- 3. RPC: get_last_active_dates - returns last active date per user from daily_time_tracking
CREATE OR REPLACE FUNCTION public.get_last_active_dates()
RETURNS TABLE(user_id uuid, last_date date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (dt.user_id)
    dt.user_id,
    dt.date AS last_date
  FROM daily_time_tracking dt
  ORDER BY dt.user_id, dt.date DESC;
$$;

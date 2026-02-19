
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create function to auto-enable access after 1 minute
CREATE OR REPLACE FUNCTION public.auto_enable_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET is_access = true, updated_at = now()
  WHERE request_date IS NOT NULL
    AND is_access = false
    AND request_date + interval '1 minute' <= now();
END;
$$;

-- Schedule cron job to run every minute
SELECT cron.schedule(
  'auto-enable-access',
  '* * * * *',
  $$SELECT public.auto_enable_access();$$
);

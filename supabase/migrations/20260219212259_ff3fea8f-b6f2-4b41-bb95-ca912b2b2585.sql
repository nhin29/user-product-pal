
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
    AND request_date + interval '30 minutes' <= now();
END;
$$;

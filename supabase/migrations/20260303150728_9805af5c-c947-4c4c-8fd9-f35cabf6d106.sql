
-- 1. Change default credit_limit from 4 to 100
ALTER TABLE public.user_credits ALTER COLUMN credit_limit SET DEFAULT 100;

-- 2. Update the handle_new_user function to use 100
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
  INSERT INTO public.user_credits (user_id, used_count, credit_limit)
  VALUES (NEW.id, 0, 100);
  
  RETURN NEW;
END;
$function$;

-- 3. Update increment_credits to default to 100
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.user_credits (user_id, used_count, credit_limit)
  VALUES (p_user_id, 1, 100)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    used_count = user_credits.used_count + 1, 
    updated_at = now()
  WHERE user_credits.used_count < user_credits.credit_limit
  RETURNING used_count INTO new_count;
  
  IF new_count IS NULL THEN
    SELECT used_count INTO new_count 
    FROM public.user_credits 
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN COALESCE(new_count, 0);
END;
$function$;

-- 4. Update all existing trial users to 100 credits
UPDATE public.user_credits SET credit_limit = 100 WHERE status = 'trial';

-- 5. Create a function to reset credits monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset used_count to 0 for all users whose period_reset_at is older than 1 month
  UPDATE public.user_credits
  SET 
    used_count = 0,
    period_reset_at = now(),
    updated_at = now(),
    status = CASE 
      WHEN status = 'expired' THEN 'trial'
      ELSE status 
    END
  WHERE period_reset_at <= (now() - interval '1 month');
END;
$function$;

-- 6. Schedule monthly credit reset via pg_cron (runs daily at midnight ET to catch resets)
SELECT cron.schedule(
  'reset-monthly-credits',
  '0 5 * * *',
  $$SELECT public.reset_monthly_credits()$$
);

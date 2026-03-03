
-- Revert default credit_limit back to 4
ALTER TABLE public.user_credits ALTER COLUMN credit_limit SET DEFAULT 4;

-- Revert trial users back to 4
UPDATE public.user_credits SET credit_limit = 4 WHERE status = 'trial';

-- Revert handle_new_user back to 4
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
  VALUES (NEW.id, 0, 4);
  
  RETURN NEW;
END;
$function$;

-- Revert increment_credits back to 4
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
  VALUES (p_user_id, 1, 4)
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

-- Update reset function: only reset subscribers, give them 100 credits
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset used_count for subscribed users whose period is older than 1 month
  UPDATE public.user_credits
  SET 
    used_count = 0,
    period_reset_at = now(),
    updated_at = now()
  WHERE status = 'subscribed'
    AND period_reset_at <= (now() - interval '1 month');
END;
$function$;

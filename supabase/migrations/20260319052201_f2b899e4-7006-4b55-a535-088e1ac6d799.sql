CREATE OR REPLACE FUNCTION public.handle_credits_exhausted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.used_count >= NEW.credit_limit THEN
    IF NEW.status = 'subscribed' THEN
      NEW.status := 'expired';
    ELSIF NEW.status = 'one_time' THEN
      NEW.status := 'finished';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
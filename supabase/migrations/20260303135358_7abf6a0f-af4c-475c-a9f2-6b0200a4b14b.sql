
-- Trigger function: when used_count >= credit_limit, cancel subscription and mark credits expired
CREATE OR REPLACE FUNCTION public.handle_credits_exhausted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when credits are fully used
  IF NEW.used_count >= NEW.credit_limit AND NEW.status = 'subscribed' THEN
    -- Mark credits as expired
    NEW.status := 'expired';
    
    -- Cancel the active subscription
    UPDATE public.user_subscriptions
    SET status = 'canceled',
        canceled_at = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to user_credits table
CREATE TRIGGER on_credits_exhausted
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_credits_exhausted();

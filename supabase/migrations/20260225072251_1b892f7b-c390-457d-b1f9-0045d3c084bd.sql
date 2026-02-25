ALTER TABLE public.user_credits 
ADD COLUMN status text NOT NULL DEFAULT 'trial';

COMMENT ON COLUMN public.user_credits.status IS 'User subscription status: trial, subscribed, expired, free';
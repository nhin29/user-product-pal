
CREATE POLICY "Admins can insert subscribers"
ON public.stripe_subscribers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

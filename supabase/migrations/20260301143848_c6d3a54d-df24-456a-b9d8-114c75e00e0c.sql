
CREATE POLICY "Admins can update subscribers"
ON public.stripe_subscribers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscribers"
ON public.stripe_subscribers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
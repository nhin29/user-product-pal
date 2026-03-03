
CREATE POLICY "Admins can insert credits"
ON public.user_credits
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update credits"
ON public.user_credits
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- Allow admins to update chats (to set read_at)
CREATE POLICY "Admins can update chats"
ON public.chats
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

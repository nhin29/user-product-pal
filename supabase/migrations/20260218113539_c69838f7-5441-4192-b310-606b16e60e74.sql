-- Allow admins to insert support chats (for follow-up replies)
CREATE POLICY "Admins can insert support chats"
ON public.support_chats
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
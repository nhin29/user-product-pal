
-- Allow users to update read_at on chats in their conversations
CREATE POLICY "Users can mark chats as read"
ON public.chats
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = chats.conversation_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = chats.conversation_id AND c.user_id = auth.uid()
));

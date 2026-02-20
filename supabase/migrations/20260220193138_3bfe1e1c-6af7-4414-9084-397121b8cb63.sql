
-- Add read_at column to track when messages are seen
ALTER TABLE public.chats ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

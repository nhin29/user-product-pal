-- Create a function that triggers the notify-admin-support edge function
-- when a user sends a message (sender_role = 'user')
CREATE OR REPLACE FUNCTION public.notify_admin_on_user_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conversation_record RECORD;
  user_profile RECORD;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger for user messages
  IF NEW.sender_role != 'user' THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Get user profile with email
  SELECT p.display_name, u.email
  INTO user_profile
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE p.user_id = conversation_record.user_id
  LIMIT 1;

  -- Call edge function via pg_net (async HTTP)
  PERFORM net.http_post(
    url := 'https://kphwtvbsyfjgzuyaszwp.supabase.co/functions/v1/notify-admin-support',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'conversationId', NEW.conversation_id,
      'message', NEW.message,
      'userName', COALESCE(user_profile.display_name, 'Unknown User'),
      'userEmail', COALESCE(user_profile.email, 'unknown')
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_user_chat_message_notify_admin
AFTER INSERT ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_user_message();

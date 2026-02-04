-- Enable the pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to detect greeting messages and trigger auto-reply
CREATE OR REPLACE FUNCTION public.auto_reply_greeting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  greeting_patterns TEXT[] := ARRAY['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'how are you', 'howdy', 'hiya', 'sup', 'whats up', "what's up", 'greetings'];
  lower_question TEXT;
  is_greeting BOOLEAN := FALSE;
  pattern TEXT;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only process new pending messages
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Normalize the question
  lower_question := LOWER(TRIM(NEW.question));
  
  -- Check if it's a simple greeting (short message matching patterns)
  IF LENGTH(lower_question) <= 50 THEN
    FOREACH pattern IN ARRAY greeting_patterns
    LOOP
      IF lower_question = pattern 
         OR lower_question LIKE pattern || '%'
         OR lower_question LIKE '%' || pattern
         OR lower_question ~ ('^' || pattern || '[!?.]*$')
      THEN
        is_greeting := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- If it's a greeting, call the edge function
  IF is_greeting THEN
    edge_function_url := 'https://kphwtvbsyfjgzuyaszwp.supabase.co/functions/v1/auto-reply-greeting-trigger';
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Make async HTTP call to edge function
    PERFORM extensions.http_post(
      edge_function_url,
      jsonb_build_object(
        'chat_id', NEW.id,
        'question', NEW.question,
        'user_id', NEW.user_id
      )::text,
      'application/json'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new support chats
DROP TRIGGER IF EXISTS on_support_chat_created ON public.support_chats;
CREATE TRIGGER on_support_chat_created
  AFTER INSERT ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reply_greeting();
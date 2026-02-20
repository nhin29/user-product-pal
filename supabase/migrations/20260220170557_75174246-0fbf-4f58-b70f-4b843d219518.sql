
-- Migrate support_chats data to conversations + chats tables
-- Step 1: Create a conversation for each unique user_id that doesn't already have one
INSERT INTO conversations (user_id, status, created_at, updated_at)
SELECT DISTINCT sc.user_id, 'open', MIN(sc.created_at), MAX(sc.created_at)
FROM support_chats sc
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.user_id = sc.user_id
)
GROUP BY sc.user_id;

-- Step 2: Insert user questions as chat messages
INSERT INTO chats (conversation_id, sender_id, sender_role, message, created_at)
SELECT 
  c.id,
  sc.user_id,
  'user',
  sc.question,
  sc.created_at
FROM support_chats sc
JOIN conversations c ON c.user_id = sc.user_id;

-- Step 3: Insert admin answers as chat messages (only where answer exists)
INSERT INTO chats (conversation_id, sender_id, sender_role, message, created_at)
SELECT 
  c.id,
  sc.answered_by,
  'admin',
  sc.answer,
  sc.answered_at
FROM support_chats sc
JOIN conversations c ON c.user_id = sc.user_id
WHERE sc.answer IS NOT NULL AND sc.answered_at IS NOT NULL;

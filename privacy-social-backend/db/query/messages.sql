-- name: CreateMessage :one
INSERT INTO messages (
  sender_id,
  receiver_id,
  content
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: ListMessages :many
SELECT * FROM messages
WHERE (sender_id = $1 AND receiver_id = $2)
   OR (sender_id = $2 AND receiver_id = $1)
ORDER BY created_at ASC;

-- name: DeleteOldMessages :exec
-- Delete messages older than specified days (default: 30 days)
DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '30 days';

-- name: DeleteMessage :exec
DELETE FROM messages
WHERE id = $1 AND sender_id = $2;

-- name: UpdateMessage :one
UPDATE messages
SET content = $3
WHERE id = $1 AND sender_id = $2
RETURNING *;

-- name: GetMessage :one
SELECT * FROM messages WHERE id = $1;

-- name: MarkMessageRead :one
UPDATE messages
SET read_at = NOW()
WHERE id = $1 AND receiver_id = $2 AND read_at IS NULL
RETURNING *;

-- name: MarkConversationRead :exec
UPDATE messages
SET read_at = NOW()
WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL;

-- name: CreateMessageReaction :one
INSERT INTO message_reactions (message_id, user_id, emoji)
VALUES ($1, $2, $3)
ON CONFLICT (message_id, user_id, emoji) DO NOTHING
RETURNING *;

-- name: DeleteMessageReaction :exec
DELETE FROM message_reactions
WHERE message_id = $1 AND user_id = $2 AND emoji = $3;

-- name: GetMessageReactions :many
SELECT mr.*, u.username, u.avatar_url
FROM message_reactions mr
JOIN users u ON mr.user_id = u.id
WHERE mr.message_id = $1
ORDER BY mr.created_at ASC;

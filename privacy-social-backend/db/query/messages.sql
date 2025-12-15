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


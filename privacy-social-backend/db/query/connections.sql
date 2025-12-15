-- name: CreateConnectionRequest :one
INSERT INTO connections (
  requester_id,
  target_id,
  status
) VALUES (
  $1, $2, 'pending'
) RETURNING *;

-- name: UpdateConnectionStatus :one
UPDATE connections
SET status = $3, updated_at = now()
WHERE requester_id = $1 AND target_id = $2
RETURNING *;

-- name: CountConnectionRequestsToday :one
SELECT COUNT(*) FROM connections
WHERE requester_id = $1
AND created_at > NOW() - INTERVAL '24 hours'
AND status = 'pending';

-- name: GetConnection :one
SELECT * FROM connections
WHERE (requester_id = $1 AND target_id = $2)
   OR (requester_id = $2 AND target_id = $1)
LIMIT 1;

-- name: ListConnections :many
SELECT 
    u.id, 
    u.username, 
    u.full_name, 
    u.avatar_url
FROM connections c
JOIN users u ON (u.id = c.requester_id OR u.id = c.target_id)
WHERE (c.requester_id = $1 OR c.target_id = $1)
  AND c.status = 'accepted'
  AND u.id != $1;

-- name: CreateUser :one
INSERT INTO users (
  phone,
  password_hash,
  username,
  full_name
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: GetUserByPhone :one
SELECT * FROM users
WHERE phone = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: UpdateUserTrust :one
UPDATE users
SET trust_level = $2
WHERE id = $1
RETURNING *;

-- name: UpdateUserProfile :one
UPDATE users
SET 
  full_name = COALESCE(sqlc.narg('full_name'), full_name),
  avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
  bio = COALESCE(sqlc.narg('bio'), bio)
WHERE id = $1
RETURNING *;

-- Privacy Features

-- name: ToggleGhostMode :one
UPDATE users
SET is_ghost_mode = $2
WHERE id = $1
RETURNING *;

-- name: DeleteAllUserData :exec
-- Used for panic mode - deletes all user data
DELETE FROM users
WHERE id = $1;

-- Admin Queries

-- name: ListUsers :many
SELECT * FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: BanUser :one
UPDATE users
SET is_shadow_banned = $2
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: GetUserStats :one
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '1 hour') as active_users_1h
FROM users;


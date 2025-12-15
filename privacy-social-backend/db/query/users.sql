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

-- name: UpdateUserActivity :one
-- Updates last_active_at and calculates activity streak
UPDATE users
SET 
  last_active_at = now(),
  activity_streak = CASE
    -- If last active was yesterday, increment streak
    WHEN DATE(last_active_at) = CURRENT_DATE - INTERVAL '1 day' THEN activity_streak + 1
    -- If last active was today, keep streak
    WHEN DATE(last_active_at) = CURRENT_DATE THEN activity_streak
    -- If missed days but has freezes, keep streak
    WHEN streak_freezes_remaining > 0 THEN activity_streak
    -- Otherwise reset streak to 1
    ELSE 1
  END,
  streak_freezes_remaining = CASE
    -- Consume freeze only if missed days and has freezes
    WHEN DATE(last_active_at) < CURRENT_DATE - INTERVAL '1 day' AND streak_freezes_remaining > 0 THEN streak_freezes_remaining - 1
    ELSE streak_freezes_remaining
  END,
  streak_updated_at = now()
WHERE id = $1
RETURNING *;

-- name: GetUserActivityStatus :one
-- Get user's activity status and visibility
SELECT 
  id,
  username,
  last_active_at,
  CASE
    WHEN DATE(last_active_at) < CURRENT_DATE - INTERVAL '1 day' THEN 0
    ELSE activity_streak
  END as activity_streak,
  CASE
    WHEN DATE(last_active_at) >= CURRENT_DATE - INTERVAL '1 day' THEN 'active'
    ELSE 'hidden'
  END as visibility_status,
  CASE
    WHEN DATE(last_active_at) >= CURRENT_DATE - INTERVAL '1 day' THEN true
    ELSE false
  END as is_visible
FROM users
WHERE id = $1;

-- name: GetUserProfile :one
-- Get public user profile information
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  is_premium,
  CASE
    WHEN DATE(last_active_at) < CURRENT_DATE - INTERVAL '1 day' THEN 0
    ELSE activity_streak
  END as activity_streak,
  last_active_at,
  created_at,
  CASE
    WHEN DATE(last_active_at) >= CURRENT_DATE - INTERVAL '1 day' THEN 'active'
    ELSE 'hidden'
  END as visibility_status
FROM users
WHERE id = $1
AND is_shadow_banned = false;

-- name: GetUserStats :one
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '1 hour') as active_users_1h
FROM users;

-- name: BoostUser :one
UPDATE users
SET boost_expires_at = $2
WHERE id = $1
RETURNING *;


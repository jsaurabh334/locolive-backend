-- name: CreateStory :one
INSERT INTO stories (
  user_id,
  media_url,
  media_type,
  geohash,
  geom,
  is_anonymous,
  expires_at
) VALUES (
  @user_id, @media_url, @media_type, @geohash, ST_SetSRID(ST_MakePoint(@lng::float8, @lat::float8), 4326), @is_anonymous, @expires_at
) RETURNING *;

-- name: GetStoryByID :one
SELECT * FROM stories
WHERE id = $1 LIMIT 1;

-- name: GetStoriesWithinRadius :many
SELECT s.* FROM stories s
JOIN users u ON s.user_id = u.id
WHERE ST_DWithin(
  s.geom,
  ST_SetSRID(ST_MakePoint(@lng::float8, @lat::float8), 4326)::geography,
  @radius_meters::float8
)
AND s.expires_at > now()
AND u.is_ghost_mode = false
AND u.is_shadow_banned = false
ORDER BY s.created_at DESC;

-- name: GetStoriesInBounds :many
-- Get stories within a bounding box for map view
SELECT s.*, u.username, u.avatar_url
FROM stories s
JOIN users u ON s.user_id = u.id
WHERE s.geom && ST_MakeEnvelope(@west::float8, @south::float8, @east::float8, @north::float8, 4326)
AND s.expires_at > now()
AND u.is_ghost_mode = false
AND u.is_shadow_banned = false
ORDER BY s.created_at DESC
LIMIT 100;

-- name: DeleteExpiredStories :exec
DELETE FROM stories
WHERE expires_at < now();

-- Admin: Delete story
-- name: DeleteStory :exec
DELETE FROM stories
WHERE id = $1;

-- Admin: List all stories
-- name: ListAllStories :many
SELECT s.*, u.username
FROM stories s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT $1 OFFSET $2;

-- Admin: Story stats
-- name: GetStoryStats :one
SELECT 
  COUNT(*) as total_stories,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as stories_24h,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_stories
FROM stories;

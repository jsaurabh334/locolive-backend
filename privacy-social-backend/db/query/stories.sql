-- name: CreateStory :one
INSERT INTO stories (
  user_id,
  media_url,
  media_type,
  geohash,
  geom,
  is_anonymous,
  is_premium,
  expires_at
) VALUES (
  @user_id, @media_url, @media_type, @geohash, ST_SetSRID(ST_MakePoint(@lng::float8, @lat::float8), 4326), @is_anonymous, @is_premium, @expires_at
) RETURNING *;

-- name: GetStoryByID :one
SELECT * FROM stories
WHERE id = $1 LIMIT 1;

-- name: GetStoriesWithinRadius :many
SELECT s.*, u.username, u.avatar_url, u.is_premium
FROM stories s
JOIN users u ON s.user_id = u.id
WHERE 
  ST_DWithin(
    s.geom::geography,
    ST_MakePoint(@lng::float8, @lat::float8)::geography,
    @radius_meters
  )
  AND s.expires_at > now()
  AND (s.is_anonymous = false OR s.user_id = @user_id) -- Only show non-anonymous or own stories in feed (logic choice)
  AND u.is_ghost_mode = false -- Hide ghost mode users
  AND u.is_shadow_banned = false
  -- Strict Streak Rule: User must have posted today or yesterday
  AND DATE(u.last_active_at) >= CURRENT_DATE - INTERVAL '1 day'
  -- Block Rule: Exclude if blocked by either party
  AND NOT EXISTS (
    SELECT 1 FROM connections c
    WHERE (c.requester_id = @user_id AND c.target_id = s.user_id AND c.status = 'blocked')
       OR (c.requester_id = s.user_id AND c.target_id = @user_id AND c.status = 'blocked')
  )
ORDER BY 
  (u.boost_expires_at > now()) DESC NULLS LAST, -- Live boost first
  u.is_premium DESC,                            -- Premium second
  s.created_at DESC;                            -- Newest third

-- name: GetConnectionStories :many
-- Get stories from connected users (not limited by radius)
SELECT s.*, u.username, u.avatar_url, u.is_premium
FROM stories s
JOIN users u ON s.user_id = u.id
JOIN connections c ON 
  (c.requester_id = @user_id AND c.target_id = s.user_id) OR
  (c.target_id = @user_id AND c.requester_id = s.user_id)
WHERE 
  c.status = 'accepted'
  AND s.expires_at > now()
  AND u.is_shadow_banned = false
  -- Strict Streak Rule applies to connections too? User says "Profile is NOT visible"
  -- Assuming this applies everywhere
  AND DATE(u.last_active_at) >= CURRENT_DATE - INTERVAL '1 day'
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
AND DATE(u.last_active_at) >= CURRENT_DATE - INTERVAL '1 day'
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

-- Story Views

-- name: CreateStoryView :one
INSERT INTO story_views (
  story_id,
  user_id
) VALUES (
  $1, $2
) ON CONFLICT (story_id, user_id) DO UPDATE
SET viewed_at = now()
RETURNING *;

-- name: GetStoryViewers :many
-- Only accessible by story owner
SELECT sv.*, u.username, u.avatar_url
FROM story_views sv
JOIN users u ON sv.user_id = u.id
WHERE sv.story_id = $1
ORDER BY sv.viewed_at DESC;

-- name: CountStoryViews :one
SELECT COUNT(*) FROM story_views
WHERE story_id = $1;

-- Story Reactions

-- name: CreateStoryReaction :one
INSERT INTO story_reactions (
  story_id,
  user_id,
  emoji
) VALUES (
  $1, $2, $3
) ON CONFLICT (story_id, user_id) DO UPDATE
SET emoji = EXCLUDED.emoji, created_at = now()
RETURNING *;

-- name: DeleteStoryReaction :exec
DELETE FROM story_reactions
WHERE story_id = $1 AND user_id = $2;

-- name: GetStoryReactions :many
SELECT sr.*, u.username, u.avatar_url
FROM story_reactions sr
JOIN users u ON sr.user_id = u.id
WHERE sr.story_id = $1
ORDER BY sr.created_at DESC;

-- name: CountStoryReactions :one
SELECT COUNT(*) FROM story_reactions
WHERE story_id = $1;

-- name: CreateCrossing :one
INSERT INTO crossings (
  user_id_1,
  user_id_2,
  location_center,
  occurred_at
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: GetCrossingsForUser :many
SELECT c.* FROM crossings c
JOIN users u1 ON c.user_id_1 = u1.id
JOIN users u2 ON c.user_id_2 = u2.id
WHERE (c.user_id_1 = $1 OR c.user_id_2 = $1)
AND u1.is_ghost_mode = false
AND u2.is_ghost_mode = false
ORDER BY c.occurred_at DESC;

-- name: FindPotentialCrossings :many
SELECT 
    l1.user_id AS user1, 
    l2.user_id AS user2, 
    l1.geohash AS location, 
    l1.time_bucket
FROM locations l1
JOIN locations l2 ON l1.geohash = l2.geohash AND l1.time_bucket = l2.time_bucket
JOIN users u1 ON l1.user_id = u1.id
JOIN users u2 ON l2.user_id = u2.id
WHERE l1.user_id < l2.user_id
AND l1.time_bucket >= @min_time::timestamptz
AND l1.time_bucket < @max_time::timestamptz
AND u1.is_ghost_mode = false
AND u2.is_ghost_mode = false
GROUP BY l1.user_id, l2.user_id, l1.geohash, l1.time_bucket;


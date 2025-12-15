-- name: CreateLocation :one
INSERT INTO locations (
  user_id,
  geohash,
  geom,
  time_bucket,
  expires_at
) VALUES (
  @user_id, @geohash, ST_SetSRID(ST_MakePoint(@lng::float8, @lat::float8), 4326), @time_bucket, @expires_at
) RETURNING *;

-- name: DeleteExpiredLocations :exec
DELETE FROM locations
WHERE expires_at < now();

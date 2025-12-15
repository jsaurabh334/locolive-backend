# Privacy-First Location Social App Backend (Go)

A high-scale, privacy-focused backend for a location-based social application, built with Go, PostgreSQL/PostGIS, and Redis.

## Key Features

- **Privacy-First Location**: Exact user location is **never** exposed. Raw GPS coordinates are converted to Geohashes and stored in ephemeral time buckets (10 mins). All location data is strictly deleted after 24 hours.
- **Dynamic Radius Discovery**: Feed algorithms expand search radius (5km -> 20km) dynamically to find relevant content without revealing exact distances.
- **Cross-Path Matching**: Background workers detect if two users crossed paths (same 7-char geohash + same time bucket) to suggest connections, without real-time tracking.
- **Ephemeral Stories**: Stories posted by users automatically expire after 24 hours.
- **Secure Auth**: JWT-based authentication with Access and Refresh tokens.
- **Real-time Chat**: WebSocket-based messaging for connected users.

## Tech Stack

- **Go** (Golang): Core backend.
- **Gin**: High-performance HTTP web framework.
- **PostgreSQL + PostGIS**: Relational DB with advanced geospatial capabilities.
- **Redis**: Caching and real-time data support.
- **sqlc**: Type-safe Go code generation from SQL.
- **golang-migrate**: Database migrations.

## Architecture

The project follows a **Clean Architecture** layout:

- `cmd/server`: Entry point.
- `internal/api`: HTTP Handlers and middleware (Adapter Layer).
- `internal/core`: Domain logic (if strictly separated) / Business logic.
- `internal/repository`: Database access (Adapter Layer).
- `internal/worker`: Background jobs (Cleanup, Crossing Detection).
- `db/query`: SQL queries used by sqlc.

## Setup & Running

1. **Prerequisites**:
   - Go 1.21+
   - Docker & Docker Compose

2. **Start Infrastructure**:
   ```bash
   make network
   make postgres
   make redis
   # OR simply:
   docker-compose up -d
   ```

3. **Initialize Database**:
   ```bash
   make createdb
   make migrateup
   ```

4. **Run Server**:
   ```bash
   make server
   ```
   Server starts on `0.0.0.0:8080`.

## Privacy Decisions

1. **No Exact Coordinates in API**: The `CreateLocation` API accepts lat/lng, but the `GetFeed` API returns `db.Story` structs. **Client-side logic** should only display fuzzy distance (e.g., "Nearby", "< 5km"). The backend logic strictly limits discovery to the geohash/radius match.
2. **Data Expiry**: The `CleanupWorker` runs every 10 minutes to explicitly `DELETE` records from `locations` table where `expires_at < now()`.
3. **Time Bucketing**: Crossings are not calculated by continuous GPS traces. Users are simply placed in a geospatial bucket for a specific time window. Matches occur only if buckets overlap.

## Testing

Run unit tests:
```bash
make test
```

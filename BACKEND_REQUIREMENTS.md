# Backend Overview & Requirements

This document provides a comprehensive list of everything needed to create and run the Privacy-First Social Backend.

## 1. Technology Stack

### Core Technologies
- **Language**: Go (Golang) 1.25.5
- **Web Framework**: Gin (`github.com/gin-gonic/gin`)
- **WebSockets**: Gorilla WebSockets (`github.com/gorilla/websocket`)
- **Database**: PostgreSQL 15 + PostGIS (for spatial data)
- **Caching**: Redis 7
- **Authentication**: JWT (JSON Web Tokens)
- **Configuration**: Viper (`github.com/spf13/viper`)
- **Logging**: Zerolog (`github.com/rs/zerolog`)

### Key Libraries
- **Database Driver**: `lib/pq`
- **Geo-Spatial**: `mmcloughlin/geohash`
- **Testing**: `testify`, `gomock`
- **Rate Limiting**: `ulule/limiter`

## 2. Infrastructure & Environment

### Docker Containers
Managed via `docker-compose.yml`:
1.  **Database**: `postgis/postgis:15-3.3-alpine`
    - Container Name: `privacy_social_db`
    - Port: `5432`
    - Volume: `postgres_data`
2.  **Cache**: `redis:7-alpine`
    - Container Name: `privacy_social_redis`
    - Port: `6379`
    - Volume: `redis_data`

### Environment Variables (`app.env`)
Required variables for the application to run:
```ini
DB_DRIVER=postgres
DB_SOURCE=postgresql://postgres:password@localhost:5432/privacy_social?sslmode=disable
SERVER_ADDRESS=0.0.0.0:8080
REDIS_ADDRESS=localhost:6379
JWT_SECRET=[YOUR_SECRET_KEY]
ACCESS_TOKEN_DURATION=15m
REFRESH_TOKEN_DURATION=24h
AWS_REGION=us-east-1
AWS_BUCKET_NAME=privacy-social-media
AWS_ACCESS_KEY_ID=fake
AWS_SECRET_ACCESS_KEY=fake
```

## 3. Development Tools & CLI

### Essential Tools
- **Make**: For running build/dev commands (refer to `Makefile`).
- **Migrate**: For database schema migrations (`golang-migrate`).
- **Sqlc**: For generating type-safe Go code from SQL queries.
    - Config: `sqlc.yaml`
    - Output: `internal/repository/db`

### Key Make Commands
- `make network`: Create Docker network.
- `make postgres`: Start Postgres container.
- `make redis`: Start Redis container.
- `make createdb`: Create the initial database.
- `make migrateup`: Run DB migrations.
- `make sqlc`: Generate Go code from SQL.
- `make server`: Start the Go application.
- `make test`: Run tests.

## 4. Project Structure (Key Directories)
- **`/cmd/server`**: Entry point (`main.go`).
- **`/internal`**: Core application logic.
    - **`/api`**: HTTP handlers and routing.
    - **`/repository/db`**: Generated DB code (sqlc).
    - **`/worker`**: Background tasks (Cleanup, Crossing detection).
- **`/db`**: Database related files.
    - **`/migrations`**: SQL migration files.
    - **`/query`**: SQL queries for `sqlc`.

## 5. Core System Concepts
- **Visibility Engine**: Privacy based on user activity (Active -> Fading -> Hidden).
- **Spatial Features**: Expanding radius feed, crossing detection.
- **Safety**: Ghost Mode, Panic Mode (data wipe).

DB_URL=postgresql://postgres:password@localhost:5432/privacy_social?sslmode=disable

network:
	docker network create bank-network

postgres:
	docker-compose up -d postgres

redis:
	docker-compose up -d redis

createdb:
	docker exec -it privacy_social_db createdb --username=postgres --owner=postgres privacy_social

dropdb:
	docker exec -it privacy_social_db dropdb privacy_social

migrateup:
	migrate -path db/migrations -database "$(DB_URL)" -verbose up

migratedown:
	migrate -path db/migrations -database "$(DB_URL)" -verbose down

sqlc:
	sqlc generate

test:
	go test -v -cover ./...

server:
	go run cmd/server/main.go

.PHONY: network postgres redis createdb dropdb migrateup migratedown sqlc test server

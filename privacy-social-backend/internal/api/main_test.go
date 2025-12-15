package api

import (
	"testing"

	_ "github.com/lib/pq"
	"privacy-social-backend/internal/config"
	"privacy-social-backend/internal/repository"
)

func newTestServer(t *testing.T, store repository.Store) *Server {
	config := config.Config{
		TokenSymmetricKey: "12345678901234567890123456789012",
		AccessTokenDuration: 15 * 60 * 1000000000, // 15 minutes in nanoseconds
		RefreshTokenDuration: 24 * 60 * 60 * 1000000000, // 24 hours
		RedisAddress: "localhost:6379",
	}

	server, err := NewServer(config, store)
	if err != nil {
		t.Fatal(err)
	}

	return server
}

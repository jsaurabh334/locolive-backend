package api

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"privacy-social-backend/internal/config"
	"privacy-social-backend/internal/repository"
	"privacy-social-backend/internal/token"
)

// Server serves HTTP requests for our privacy social service
type Server struct {
	config     config.Config
	store      repository.Store
	tokenMaker token.Maker
	redis      *redis.Client
	router     *gin.Engine
	hub        *Hub
	safety     *SafetyMonitor
}

// NewServer creates a new HTTP server and setup routing
func NewServer(config config.Config, store repository.Store) (*Server, error) {
	tokenMaker, err := token.NewJWTMaker(config.TokenSymmetricKey)
	if err != nil {
		return nil, fmt.Errorf("cannot create token maker: %w", err)
	}

	opt, err := redis.ParseURL(config.RedisAddress)
	if err != nil {
		// Fallback for simple address
		opt = &redis.Options{Addr: config.RedisAddress}
	}

	rdb := redis.NewClient(opt)
	hub := NewHub()
	go hub.Run() // Start the hub in a goroutine

	server := &Server{
		config:     config,
		store:      store,
		tokenMaker: tokenMaker,
		redis:      rdb,
		safety:     NewSafetyMonitor(rdb),
		hub:        hub,
	}

	server.setupRouter()
	return server, nil
}

// Start runs the HTTP server on a specific address
func (server *Server) Start(address string) error {
	return server.router.Run(address)
}

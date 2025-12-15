package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"privacy-social-backend/internal/api"
	"privacy-social-backend/internal/config"
	"privacy-social-backend/internal/repository"
	"privacy-social-backend/internal/worker"
)

func main() {
	// Setup structured logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	config, err := config.LoadConfig(".")
	if err != nil {
		log.Fatal().Err(err).Msg("cannot load config")
	}

	conn, err := sql.Open(config.DBDriver, config.DBSource)
	if err != nil {
		log.Fatal().Err(err).Msg("cannot connect to db")
	}
	defer conn.Close()

	// Optimize connection pool for better performance
	conn.SetMaxOpenConns(100)                  // Maximum open connections
	conn.SetMaxIdleConns(25)                   // Maximum idle connections
	conn.SetConnMaxLifetime(5 * time.Minute)   // Connection lifetime
	conn.SetConnMaxIdleTime(2 * time.Minute)   // Idle connection timeout

	// Test connection
	if err := conn.Ping(); err != nil {
		log.Fatal().Err(err).Msg("cannot ping database")
	}
	log.Info().Msg("Database connection pool configured successfully")

	store := repository.NewStore(conn)
    
    // Start background workers
    cleanupWorker := worker.NewCleanupWorker(store)
    cleanupWorker.Start()
    cleanupWorker.StartCrossingDetector()
    
	server, err := api.NewServer(config, store)
	if err != nil {
		log.Fatal().Err(err).Msg("cannot create server")
	}

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := server.Start(config.ServerAddress); err != nil {
			log.Fatal().Err(err).Msg("cannot start server")
		}
	}()

	log.Info().Msgf("Server started on %s", config.ServerAddress)

	<-ctx.Done()
	log.Info().Msg("Shutting down gracefully...")

	// Give outstanding requests 5 seconds to complete
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Here you would call server.Shutdown(shutdownCtx) if Gin supported it
	// For now, just wait for the timeout
	<-shutdownCtx.Done()
	log.Info().Msg("Server stopped")
}


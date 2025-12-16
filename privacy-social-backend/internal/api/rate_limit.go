package api

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	sredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

// Rate limit configurations
var (
	// General API rate limit: 100 requests per minute
	generalRate = limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  100,
	}

	// Auth endpoints: 60 requests per 1 minute
	authRate = limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  60,
	}

	// Story creation: 50 per hour
	storyRate = limiter.Rate{
		Period: 1 * time.Hour,
		Limit:  50,
	}

	// Location updates: 60 per hour
	locationRate = limiter.Rate{
		Period: 1 * time.Hour,
		Limit:  60,
	}

	// Messages: 100 per minute
	messageRate = limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  100,
	}
)

// createRateLimiter creates a rate limiter with Redis store
func (server *Server) createRateLimiter(rate limiter.Rate) gin.HandlerFunc {
	// Bypass rate limiting in tests
	if gin.Mode() == gin.TestMode {
		return func(ctx *gin.Context) {
			ctx.Next()
		}
	}

	store, err := sredis.NewStoreWithOptions(server.redis, limiter.StoreOptions{
		Prefix:   "rate_limit",
		MaxRetry: 3,
	})
	if err != nil {
		// Fallback to in-memory if Redis fails
		store = memory.NewStore()
	}

	instance := limiter.New(store, rate)
	middleware := mgin.NewMiddleware(instance)

	return middleware
}

// generalRateLimiter applies general rate limiting
func (server *Server) generalRateLimiter() gin.HandlerFunc {
	return server.createRateLimiter(generalRate)
}

// authRateLimiter applies strict rate limiting for auth endpoints
func (server *Server) authRateLimiter() gin.HandlerFunc {
	return server.createRateLimiter(authRate)
}

// storyRateLimiter applies rate limiting for story creation
func (server *Server) storyRateLimiter() gin.HandlerFunc {
	return server.createRateLimiter(storyRate)
}

// locationRateLimiter applies rate limiting for location updates
func (server *Server) locationRateLimiter() gin.HandlerFunc {
	return server.createRateLimiter(locationRate)
}

// messageRateLimiter applies rate limiting for messaging
func (server *Server) messageRateLimiter() gin.HandlerFunc {
	return server.createRateLimiter(messageRate)
}

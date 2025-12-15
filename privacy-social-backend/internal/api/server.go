package api

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/gzip"
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

	server := &Server{
		config:     config,
		store:      store,
		tokenMaker: tokenMaker,
		redis:      rdb,
	}

	server.setupRouter()
	return server, nil
}

func (server *Server) setupRouter() {
	router := gin.Default()

	// Enable gzip compression (70% bandwidth reduction)
	router.Use(gzip.Gzip(gzip.DefaultCompression))

	// Apply general rate limiting to all routes
	router.Use(server.generalRateLimiter())

	// Public routes with strict rate limiting
	router.POST("/users", server.authRateLimiter(), server.createUser)
	router.POST("/users/login", server.authRateLimiter(), server.loginUser)

	// Protected routes
	authRoutes := router.Group("/")
	authRoutes.Use(authMiddleware(server.tokenMaker))

	authRoutes.POST("/location/ping", server.locationRateLimiter(), server.updateLocation)
	authRoutes.POST("/stories", server.storyRateLimiter(), server.createStory)
	authRoutes.GET("/feed", server.getFeed)
	authRoutes.GET("/stories/map", server.getStoriesMap)
    
    authRoutes.POST("/connections/request", server.sendConnectionRequest)
    authRoutes.POST("/connections/update", server.updateConnection)
    authRoutes.GET("/messages", server.messageRateLimiter(), server.getChatHistory)
    authRoutes.GET("/ws/chat", server.chatWebSocket)
    
    authRoutes.GET("/crossings", server.getCrossings)
    authRoutes.PUT("/profile", server.updateProfile)
    authRoutes.POST("/reports", server.createReport)
    
    // Privacy features
    authRoutes.PUT("/location/ghost-mode", server.toggleGhostMode)
    authRoutes.POST("/location/panic", server.panicMode)
    
    // Notifications
    authRoutes.GET("/notifications", server.getNotifications)
    authRoutes.PUT("/notifications/:id/read", server.markNotificationRead)
    authRoutes.PUT("/notifications/read-all", server.markAllNotificationsRead)
    authRoutes.GET("/notifications/unread-count", server.getUnreadCount)
    
    // Story engagement
    authRoutes.POST("/stories/:id/view", server.viewStory)
    authRoutes.GET("/stories/:id/viewers", server.getStoryViewers)
    authRoutes.POST("/stories/:id/react", server.reactToStory)
    authRoutes.DELETE("/stories/:id/react", server.deleteStoryReaction)
    authRoutes.GET("/stories/:id/reactions", server.getStoryReactions)

	// Admin routes
	adminRoutes := router.Group("/admin")
	adminRoutes.Use(authMiddleware(server.tokenMaker))
	adminRoutes.Use(adminMiddleware(server))

	adminRoutes.GET("/users", server.listUsers)
	adminRoutes.POST("/users/ban", server.banUser)
	adminRoutes.DELETE("/users/:id", server.deleteUser)
	adminRoutes.GET("/stats", server.getStats)
	adminRoutes.GET("/reports", server.listReports)
	adminRoutes.PUT("/reports/:id/resolve", server.resolveReport)
	adminRoutes.GET("/stories", server.listAllStories)
	adminRoutes.DELETE("/stories/:id", server.deleteStory)

	server.router = router
}

// Start runs the HTTP server on a specific address
func (server *Server) Start(address string) error {
	return server.router.Run(address)
}

func errorResponse(err error) gin.H {
	return gin.H{"error": err.Error()}
}

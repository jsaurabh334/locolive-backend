package api

import (
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

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
	// Stories
	authRoutes.GET("/feed", server.getFeed)
	authRoutes.POST("/stories", server.createStory)
	authRoutes.GET("/stories/map", server.getStoriesMap)
	authRoutes.GET("/stories/connections", server.getConnectionStories)

	authRoutes.POST("/connections/request", server.sendConnectionRequest)
	authRoutes.POST("/connections/update", server.updateConnection)
	authRoutes.GET("/messages", server.messageRateLimiter(), server.getChatHistory)
	authRoutes.GET("/ws/chat", server.chatWebSocket)

	authRoutes.GET("/crossings", server.getCrossings)
	authRoutes.PUT("/profile", server.updateProfile)
	authRoutes.POST("/reports", server.createReport)
    authRoutes.POST("/profile/boost", server.boostProfile)


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

	// Activity & Visibility
	authRoutes.GET("/activity/status", server.getActivityStatus)

	// User Profiles
	authRoutes.GET("/users/:id", server.getUserProfile)
	authRoutes.GET("/profile/me", server.getMyProfile)

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

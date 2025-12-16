package api

import (
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

func (server *Server) setupRouter() {
	router := gin.Default()

	// CORS Middleware
	router.Use(corsMiddleware())

	// CORS Middleware
	router.Use(corsMiddleware())

	// Enable gzip compression (70% bandwidth reduction)
	router.Use(gzip.Gzip(gzip.DefaultCompression))

	// Apply general rate limiting to all routes
	router.Use(server.generalRateLimiter())

	// Public routes with strict rate limiting
	router.POST("/users", server.authRateLimiter(), server.createUser)
	router.POST("/users/login", server.authRateLimiter(), server.loginUser)

	// Static uploads
	router.Static("/uploads", "./uploads")

	// Protected routes
	authRoutes := router.Group("/")
	authRoutes.Use(authMiddleware(server.tokenMaker))

	// File upload
	authRoutes.POST("/upload", server.uploadFile)

	authRoutes.POST("/location/ping", server.locationRateLimiter(), server.updateLocation)
	// Stories
	authRoutes.GET("/feed", server.getFeed)
	authRoutes.POST("/stories", server.storyRateLimiter(), server.createStory)
	authRoutes.DELETE("/stories/:id", server.deleteUserStory)
	authRoutes.GET("/stories/map", server.getStoriesMap)
	authRoutes.GET("/stories/connections", server.getConnectionStories)

	authRoutes.GET("/connections", server.listConnections)
	authRoutes.GET("/connections/requests", server.listPendingRequests)
	authRoutes.GET("/connections/sent", server.listSentRequests)
	authRoutes.POST("/connections/request", server.sendConnectionRequest)
	authRoutes.POST("/connections/update", server.updateConnection)
	authRoutes.DELETE("/connections/:id", server.deleteConnection)
	authRoutes.GET("/messages", server.messageRateLimiter(), server.getChatHistory)
	authRoutes.POST("/messages", server.messageRateLimiter(), server.sendMessage)
	authRoutes.DELETE("/messages/:id", server.deleteMessage)
	authRoutes.PUT("/messages/:id", server.editMessage)
	authRoutes.PUT("/messages/read/:userId", server.markConversationRead)
	authRoutes.POST("/messages/:id/react", server.addReaction)
	authRoutes.DELETE("/messages/:id/react", server.removeReaction)
	authRoutes.GET("/messages/:id/reactions", server.getMessageReactions)
	authRoutes.GET("/ws/chat", server.chatWebSocket)

	authRoutes.GET("/crossings", server.getCrossings)
	authRoutes.PUT("/profile", server.updateProfile)
	authRoutes.POST("/reports", server.createReport)
	authRoutes.POST("/profile/boost", server.boostProfile)
	authRoutes.PUT("/account/email", server.updateUserEmail)
	authRoutes.PUT("/account/password", server.updateUserPassword)

	// Privacy features
	authRoutes.GET("/privacy", server.getPrivacySettings)
	authRoutes.PUT("/privacy", server.updatePrivacySettings)
	authRoutes.POST("/users/block", server.blockUser)
	authRoutes.DELETE("/users/block/:id", server.unblockUser)
	authRoutes.GET("/users/blocked", server.getBlockedUsers)
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
	authRoutes.POST("/stories/share", server.shareStory)

	// Activity & Visibility
	authRoutes.GET("/activity/status", server.getActivityStatus)

	// User Profiles
	authRoutes.GET("/users/search", server.searchUsers)
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

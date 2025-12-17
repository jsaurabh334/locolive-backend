package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mmcloughlin/geohash"
	"github.com/rs/zerolog/log"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

const (
	defaultRadiusMeters = 5000  // 5km
	maxRadiusMeters     = 20000 // 20km
	radiusStepMeters    = 5000  // 5km step
	feedCacheTTL        = 5 * time.Minute
)

type createStoryRequest struct {
	MediaURL    string  `json:"media_url" binding:"required,url"`
	MediaType   string  `json:"media_type" binding:"required,oneof=image video text"`
	Latitude    float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude   float64 `json:"longitude" binding:"required,min=-180,max=180"`
	Caption     string  `json:"caption"`
	IsAnonymous bool    `json:"is_anonymous"`
}

func (server *Server) createStory(ctx *gin.Context) {
	var req createStoryRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	hash := geohash.Encode(req.Latitude, req.Longitude)

	// Safety Check: Fake GPS
	val := server.safety.ValidateUserMovement(ctx, authPayload.UserID.String(), req.Latitude, req.Longitude)
	if !val.Allowed {
		if val.ShouldBan {
			// Shadow ban the user (silently)
			server.store.BanUser(ctx, db.BanUserParams{
				ID:             authPayload.UserID,
				IsShadowBanned: true,
			})
			log.Warn().Str("user_id", authPayload.UserID.String()).Msg("User shadow-banned for fake GPS")
		}
		// If simply not allowed but not banned, return error?
		// For Fake GPS (Speed > 1000km/h), ShouldBan is always true.
		// We continue execution to maintain the "Shadow" illusion (story is created but user is banned, so nobody sees it)
	}

	// Get user to check premium status
	user, err := server.store.GetUserByID(ctx, authPayload.UserID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Premium users get 48h expiry, free users get 24h
	expiryDuration := 24 * time.Hour
	isPremium := false
	if user.IsPremium.Valid && user.IsPremium.Bool {
		expiryDuration = 48 * time.Hour
		isPremium = true
	}
	expiresAt := time.Now().UTC().Add(expiryDuration)

	// In real app: Validate/Upload to S3 here if receiving raw file.
	// Here we accept URL.

	// Prepare caption as sql.NullString
	var captionNull sql.NullString
	if req.Caption != "" {
		captionNull = sql.NullString{String: req.Caption, Valid: true}
	}

	story, err := server.store.CreateStory(ctx, db.CreateStoryParams{
		UserID:      authPayload.UserID,
		MediaUrl:    req.MediaURL,
		MediaType:   req.MediaType,
		Caption:     captionNull,
		Geohash:     hash,
		Lng:         req.Longitude,
		Lat:         req.Latitude,
		IsAnonymous: req.IsAnonymous,
		IsPremium:   sql.NullBool{Bool: isPremium, Valid: true},
		ExpiresAt:   expiresAt,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Update user activity (for visibility system)
	_, err = server.store.UpdateUserActivity(ctx, authPayload.UserID)
	if err != nil {
		// Log error but don't fail the request
		log.Error().Err(err).Msg("Failed to update user activity")
	}

	// Create mentions if caption has @username
	if req.Caption != "" {
		go server.createStoryMentions(ctx, story.ID, req.Caption)
	}

	// Invalidate feed cache for the area
	userGeohash := truncatedGeohash(req.Latitude, req.Longitude, 5)
	server.invalidateFeedCache(userGeohash)

	ctx.JSON(http.StatusCreated, toStoryResponseFromStory(story))
}

type getFeedRequest struct {
	Latitude  float64 `form:"latitude" binding:"required,min=-90,max=90"`
	Longitude float64 `form:"longitude" binding:"required,min=-180,max=180"`
}

func (server *Server) getFeed(ctx *gin.Context) {
	var req getFeedRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	// Create cache key based on user's geohash (5 chars = ~2.4km precision)
	userGeohash := geohash.Encode(req.Latitude, req.Longitude)
	if len(userGeohash) > 5 {
		userGeohash = userGeohash[:5]
	}
	cacheKey := "feed:" + userGeohash

	// Try to get from Redis cache first
	cachedData, err := server.redis.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		// Cache hit - return cached data
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	// Cache miss - Fetch from DB
	var stories []db.GetStoriesWithinRadiusRow
	var message string = "Nearby"

	// Get auth payload for blocking/privacy rules
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Use fixed 50km radius to ensure users see others even if they have their own story nearby
	// (Previous loop bug caused early exit if own story was found at <5km)
	stories, err = server.store.GetStoriesWithinRadius(ctx, db.GetStoriesWithinRadiusParams{
		Lng:          req.Longitude,
		Lat:          req.Latitude,
		RadiusMeters: 50000.0, // 50km
		UserID:       authPayload.UserID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// If no stories found
	if len(stories) == 0 {
		message = "No users found nearby"
	}

	// Convert to response DTOs
	storyResponses := make([]StoryResponse, len(stories))
	for i, story := range stories {
		storyResponses[i] = toStoryResponse(story)
	}

	response := gin.H{
		"stories": storyResponses,
		"count":   len(storyResponses),
		"message": message,
	}

	// Cache the result for 5 minutes
	responseJSON, _ := json.Marshal(response)
	server.redis.Set(ctx, cacheKey, responseJSON, feedCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, response)
}

// deleteStory allows users to delete their own stories
func (server *Server) deleteUserStory(ctx *gin.Context) {
	storyID, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Get story to verify ownership
	story, err := server.store.GetStoryByID(ctx, storyID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "story not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Check if user owns the story
	if story.UserID != authPayload.UserID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own stories"})
		return
	}

	// Delete the story
	err = server.store.DeleteStory(ctx, storyID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate feed cache
	userGeohash := story.Geohash
	if len(userGeohash) > 5 {
		userGeohash = userGeohash[:5]
	}
	server.invalidateFeedCache(userGeohash)

	ctx.JSON(http.StatusOK, gin.H{"message": "story deleted successfully"})
}

// getConnectionStories returns stories from connected users, ignoring radius
func (server *Server) getConnectionStories(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Cache key based on user ID
	cacheKey := "stories:connections:" + authPayload.UserID.String()

	// Try Redis cache first
	cachedData, err := server.redis.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	stories, err := server.store.GetConnectionStories(ctx, authPayload.UserID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Convert to response DTOs
	storyResponses := make([]StoryResponse, len(stories))
	for i, story := range stories {
		storyResponses[i] = toStoryResponseFromConnection(story)
	}

	// Cache for 5 minutes
	responseJSON, _ := json.Marshal(storyResponses)
	server.redis.Set(ctx, cacheKey, responseJSON, feedCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, storyResponses)
}

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
	MediaURL     string  `json:"media_url" binding:"required"`
	MediaType    string  `json:"media_type" binding:"required,oneof=image video text"`
	Latitude     float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude    float64 `json:"longitude" binding:"required,min=-180,max=180"`
	Caption      string  `json:"caption"`
	IsAnonymous  bool    `json:"is_anonymous"`
	ShowLocation bool    `json:"show_location"`
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
			// In development (localhost), we just log the warning instead of banning
			// to avoid issues when users switch between real and mock locations.
			log.Warn().
				Str("user_id", authPayload.UserID.String()).
				Float64("lat", req.Latitude).
				Float64("lng", req.Longitude).
				Msg("Fake GPS detected (Dev Bypass: User not banned)")

			/*
				// Production logic: Shadow ban the user (silently)
				server.store.BanUser(ctx, db.BanUserParams{
					ID:             authPayload.UserID,
					IsShadowBanned: true,
				})
				log.Warn().Str("user_id", authPayload.UserID.String()).Msg("User shadow-banned for fake GPS")
			*/
		}
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
		UserID:       authPayload.UserID,
		MediaUrl:     req.MediaURL,
		MediaType:    req.MediaType,
		Caption:      captionNull,
		Geohash:      hash,
		Lng:          req.Longitude,
		Lat:          req.Latitude,
		IsAnonymous:  req.IsAnonymous,
		ShowLocation: req.ShowLocation,
		IsPremium:    sql.NullBool{Bool: isPremium, Valid: true},
		ExpiresAt:    expiresAt,
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

	ctx.JSON(http.StatusCreated, toStoryResponseFromCreate(story))
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

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

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
	// Incremental Radius Search (5km -> 25km)
	var searchRadius float64 = 5000
	const maxRadius = 25000
	const stepRadius = 5000

	var stories []db.GetStoriesWithinRadiusRow
	var message string

	for searchRadius <= maxRadius {
		stories, err = server.store.GetStoriesWithinRadius(ctx, db.GetStoriesWithinRadiusParams{
			Lng:          req.Longitude,
			Lat:          req.Latitude,
			RadiusMeters: searchRadius,
			UserID:       authPayload.UserID,
		})
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, errorResponse(err))
			return
		}

		if len(stories) > 0 {
			break
		}

		searchRadius += stepRadius
	}

	// Update message based on results
	if len(stories) == 0 {
		message = "No stories found within 25km"
	} else {
		message = "Stories found nearby"
	}

	// Convert to response DTOs
	storyResponses := make([]StoryResponse, len(stories))
	for i, story := range stories {
		storyResponses[i] = toStoryResponse(story)
	}

	response := gin.H{
		"stories":       storyResponses,
		"count":         len(storyResponses),
		"message":       message,
		"search_radius": searchRadius,
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

type updateStoryRequest struct {
	Caption      *string `json:"caption"`
	IsAnonymous  *bool   `json:"is_anonymous"`
	ShowLocation *bool   `json:"show_location"`
}

// updateStory allows users to edit their story within 15 minutes of posting
func (server *Server) updateStory(ctx *gin.Context) {
	storyID, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	var req updateStoryRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Prepare nullable parameters for SQL
	var captionArg sql.NullString
	if req.Caption != nil {
		captionArg = sql.NullString{String: *req.Caption, Valid: true}
	}

	var isAnonymousArg sql.NullBool
	if req.IsAnonymous != nil {
		isAnonymousArg = sql.NullBool{Bool: *req.IsAnonymous, Valid: true}
	}

	var showLocationArg sql.NullBool
	if req.ShowLocation != nil {
		showLocationArg = sql.NullBool{Bool: *req.ShowLocation, Valid: true}
	}

	// Update the story
	story, err := server.store.UpdateStory(ctx, db.UpdateStoryParams{
		ID:           storyID,
		UserID:       authPayload.UserID,
		Caption:      captionArg,
		IsAnonymous:  isAnonymousArg,
		ShowLocation: showLocationArg,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "story not found, expired, or edit window closed (15 minutes)"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate feed cache
	userGeohash := story.Geohash
	if len(userGeohash) > 5 {
		userGeohash = userGeohash[:5]
	}
	server.invalidateFeedCache(userGeohash)

	// Convert to response
	rsp := toStoryResponseFromUpdate(story)

	ctx.JSON(http.StatusOK, rsp)
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

// getStory retrieves a single story by ID
func (server *Server) getStory(ctx *gin.Context) {
	storyID, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	story, err := server.store.GetStoryByID(ctx, storyID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "story not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Check if story is expired
	if time.Now().After(story.ExpiresAt) {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "story has expired"})
		return
	}

	// Convert to response DTO
	rsp := toStoryResponseFromGet(story)

	// Fetch author details since they aren't in the partial story object
	user, err := server.store.GetUserByID(ctx, story.UserID)
	if err == nil {
		rsp.Username = user.Username
		if user.AvatarUrl.Valid {
			rsp.AvatarURL = &user.AvatarUrl.String
		}
	}

	ctx.JSON(http.StatusOK, rsp)
}

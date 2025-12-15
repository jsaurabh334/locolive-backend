package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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
    val := server.safety.ValidateUserMovement(ctx, authPayload.ID.String(), req.Latitude, req.Longitude)
    if !val.Allowed {
        if val.ShouldBan {
            // Shadow ban the user (silently)
             server.store.BanUser(ctx, db.BanUserParams{
                ID:             authPayload.ID,
                IsShadowBanned: true,
            })
            log.Warn().Str("user_id", authPayload.ID.String()).Msg("User shadow-banned for fake GPS")
        }
        // If simply not allowed but not banned, return error? 
        // For Fake GPS (Speed > 1000km/h), ShouldBan is always true.
        // We continue execution to maintain the "Shadow" illusion (story is created but user is banned, so nobody sees it)
    }
	
	// Get user to check premium status
	user, err := server.store.GetUserByID(ctx, authPayload.ID)
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

	story, err := server.store.CreateStory(ctx, db.CreateStoryParams{
		UserID:      authPayload.ID,
		MediaUrl:    req.MediaURL,
		MediaType:   req.MediaType,
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
	_, err = server.store.UpdateUserActivity(ctx, authPayload.ID)
	if err != nil {
		// Log error but don't fail the request
		log.Error().Err(err).Msg("Failed to update user activity")
	}

	// Invalidate feed cache for the area
	userGeohash := geohash.Encode(req.Latitude, req.Longitude)
	if len(userGeohash) > 5 {
		userGeohash = userGeohash[:5]
	}
	server.redis.Del(ctx, "feed:"+userGeohash)

	ctx.JSON(http.StatusCreated, story)
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

	// Cache miss - Dynamic Radius Discovery
	var stories []db.GetStoriesWithinRadiusRow
	expansionSteps := []int{5000, 10000, 15000, 20000} // 5km -> 20km auto-expansion
	var message string

	for _, radius := range expansionSteps {
		stories, err = server.store.GetStoriesWithinRadius(ctx, db.GetStoriesWithinRadiusParams{
			Lng:          req.Longitude,
			Lat:          req.Latitude,
			RadiusMeters: float64(radius),
		})
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, errorResponse(err))
			return
		}

		if len(stories) > 0 {
			// Found stories, stop expansion
			message = "Nearby"
			break
		}
	}

	// If still no stories after max radius (20km)
	if len(stories) == 0 {
		message = "No users found nearby"
	}

	response := gin.H{
		"stories": stories,
		"count":   len(stories),
		"message": message,
	}

	// Cache the result for 5 minutes
	responseJSON, _ := json.Marshal(response)
	server.redis.Set(ctx, cacheKey, responseJSON, feedCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, response)
}

// getConnectionStories returns stories from connected users, ignoring radius
func (server *Server) getConnectionStories(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Cache key based on user ID
	cacheKey := "stories:connections:" + authPayload.ID.String()

	// Try Redis cache first
	cachedData, err := server.redis.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	stories, err := server.store.GetConnectionStories(ctx, authPayload.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Cache for 5 minutes
	responseJSON, _ := json.Marshal(stories)
	server.redis.Set(ctx, cacheKey, responseJSON, feedCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, stories)
}

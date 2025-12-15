package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mmcloughlin/geohash"

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
	expiresAt := time.Now().UTC().Add(24 * time.Hour)

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
		ExpiresAt:   expiresAt,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
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
	var stories []db.Story
	currentRadius := float64(defaultRadiusMeters)
	expansionSteps := []int{5000, 10000, 15000, 20000} // 5km, 10km, 15km, 20km
	var message string
	var expanded bool

	for _, radius := range expansionSteps {
		currentRadius = float64(radius)
		
		stories, err = server.store.GetStoriesWithinRadius(ctx, db.GetStoriesWithinRadiusParams{
			Lng:          req.Longitude,
			Lat:          req.Latitude,
			RadiusMeters: currentRadius,
		})
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, errorResponse(err))
			return
		}

		if len(stories) > 0 {
			// Found stories at this radius
			if currentRadius > float64(defaultRadiusMeters) {
				expanded = true
				message = "Expanded search to find nearby stories"
			} else {
				message = "Stories found nearby"
			}
			break
		}
		
		// No stories yet, will expand in next iteration
		if currentRadius < float64(maxRadiusMeters) {
			message = "Expanding range to find stories..."
		}
	}

	// If still no stories after max radius
	if len(stories) == 0 {
		message = "No stories found within 20km. Be the first to share!"
	}

	response := gin.H{
		"radius_meters": currentRadius,
		"radius_km":     currentRadius / 1000,
		"stories":       stories,
		"count":         len(stories),
		"expanded":      expanded,
		"message":       message,
	}

	// Cache the result for 5 minutes
	responseJSON, _ := json.Marshal(response)
	server.redis.Set(ctx, cacheKey, responseJSON, feedCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, response)
}

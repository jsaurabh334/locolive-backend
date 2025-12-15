package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"privacy-social-backend/internal/token"
)

const profileCacheTTL = 10 * time.Minute

type getUserProfileRequest struct {
	UserID string `uri:"id" binding:"required,uuid"`
}

// getUserProfile returns public profile information for any user
func (server *Server) getUserProfile(ctx *gin.Context) {
	var req getUserProfileRequest
	if err := ctx.ShouldBindUri(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	// Try Redis cache first
	cacheKey := "profile:" + req.UserID
	cachedData, err := server.redis.Get(context.Background(), cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	userID, _ := uuid.Parse(req.UserID)

	profile, err := server.store.GetUserProfile(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Cache the result
	responseJSON, _ := json.Marshal(profile)
	server.redis.Set(context.Background(), cacheKey, responseJSON, profileCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, profile)
}

// getMyProfile returns the authenticated user's own profile
func (server *Server) getMyProfile(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Try Redis cache first
	cacheKey := "profile:" + authPayload.ID.String()
	cachedData, err := server.redis.Get(context.Background(), cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	profile, err := server.store.GetUserProfile(ctx, authPayload.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Cache the result
	responseJSON, _ := json.Marshal(profile)
	server.redis.Set(context.Background(), cacheKey, responseJSON, profileCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, profile)
}

package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"privacy-social-backend/internal/token"
)

const crossingsCacheTTL = 5 * time.Minute

// getCrossings returns crossings for the authenticated user
func (server *Server) getCrossings(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Try Redis cache first
	cacheKey := "crossings:" + authPayload.ID.String()
	cachedData, err := server.redis.Get(context.Background(), cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	crossings, err := server.store.GetCrossingsForUser(ctx, authPayload.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Cache the result
	responseJSON, _ := json.Marshal(crossings)
	server.redis.Set(context.Background(), cacheKey, responseJSON, crossingsCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, crossings)
}

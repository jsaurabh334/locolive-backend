package api

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
	"privacy-social-backend/internal/util"
)

type toggleGhostModeRequest struct {
	Enabled bool `json:"enabled" binding:"required"`
}

// toggleGhostMode enables or disables ghost mode for the authenticated user
func (server *Server) toggleGhostMode(ctx *gin.Context) {
	var req toggleGhostModeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	user, err := server.store.ToggleGhostMode(ctx, db.ToggleGhostModeParams{
		ID:          authPayload.ID,
		IsGhostMode: req.Enabled,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	log.Info().
		Str("user_id", user.ID.String()).
		Bool("ghost_mode", user.IsGhostMode).
		Msg("Ghost mode toggled")

	ctx.JSON(http.StatusOK, gin.H{
		"ghost_mode": user.IsGhostMode,
		"message":    "Ghost mode updated successfully",
	})
}

type panicModeRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// panicMode deletes all user data immediately (irreversible)
func (server *Server) panicMode(ctx *gin.Context) {
	var req panicModeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Verify password before proceeding
	user, err := server.store.GetUserByID(ctx, authPayload.ID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, errorResponse(err))
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	err = util.CheckPassword(req.Password, user.PasswordHash)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "incorrect password"})
		return
	}

	// Clear all Redis cache for this user
	// Cache keys: feed:{geohash}, crossings:{user_id}, messages:{user_id}:*
	redisCtx := context.Background()
	
	// Clear crossing cache
	crossingKey := "crossings:" + authPayload.ID.String()
	server.redis.Del(redisCtx, crossingKey)

	// Clear message cache (pattern match)
	messagePattern := "messages:*" + authPayload.ID.String() + "*"
	iter := server.redis.Scan(redisCtx, 0, messagePattern, 0).Iterator()
	for iter.Next(redisCtx) {
		server.redis.Del(redisCtx, iter.Val())
	}

	// Delete all user data (CASCADE will handle related records)
	err = server.store.DeleteAllUserData(ctx, authPayload.ID)
	if err != nil {
		log.Error().Err(err).Str("user_id", authPayload.ID.String()).Msg("Failed to delete user data in panic mode")
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	log.Warn().
		Str("user_id", authPayload.ID.String()).
		Str("phone", user.Phone).
		Msg("PANIC MODE ACTIVATED - All user data deleted")

	ctx.JSON(http.StatusOK, gin.H{
		"message": "All your data has been permanently deleted",
	})
}

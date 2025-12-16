package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"privacy-social-backend/internal/token"
)

// getActivityStatus returns the user's activity status and visibility
func (server *Server) getActivityStatus(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	status, err := server.store.GetUserActivityStatus(ctx, authPayload.UserID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, status)
}

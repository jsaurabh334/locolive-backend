package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"privacy-social-backend/internal/token"
)

// getCrossings returns crossings for the authenticated user
func (server *Server) getCrossings(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	crossings, err := server.store.GetCrossingsForUser(ctx, authPayload.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, crossings)
}

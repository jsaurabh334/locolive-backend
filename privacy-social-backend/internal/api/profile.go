package api

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

type updateProfileRequest struct {
	FullName  *string `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
	Bio       *string `json:"bio"`
}

func (server *Server) updateProfile(ctx *gin.Context) {
	var req updateProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	arg := db.UpdateUserProfileParams{
		ID: authPayload.ID,
	}

	if req.FullName != nil {
		arg.FullName = sql.NullString{String: *req.FullName, Valid: true}
	}
	if req.AvatarURL != nil {
		arg.AvatarUrl = sql.NullString{String: *req.AvatarURL, Valid: true}
	}
	if req.Bio != nil {
		arg.Bio = sql.NullString{String: *req.Bio, Valid: true}
	}

	user, err := server.store.UpdateUserProfile(ctx, arg)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, newUserResponse(user))
}

package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

type connectionRequest struct {
	TargetUserID string `json:"target_user_id" binding:"required,uuid"`
}

func (server *Server) sendConnectionRequest(ctx *gin.Context) {
	var req connectionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	targetID, _ := uuid.Parse(req.TargetUserID)
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Spam prevention: limit to 20 connection requests per day
	count, err := server.store.CountConnectionRequestsToday(ctx, authPayload.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}
	if count >= 20 {
		ctx.JSON(http.StatusTooManyRequests, gin.H{"error": "daily connection request limit reached (20/day)"})
		return
	}

    // Get requester info for notification
    requester, err := server.store.GetUserByID(ctx, authPayload.ID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, errorResponse(err))
        return
    }
    
	conn, err := server.store.CreateConnectionRequest(ctx, db.CreateConnectionRequestParams{
		RequesterID: authPayload.ID,
		TargetID:    targetID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}
	
	// Create notification for target user
	_, err = server.store.CreateNotification(ctx, db.CreateNotificationParams{
		UserID:        targetID,
		Type:          "connection_request",
		Title:         "New Connection Request",
		Message:       fmt.Sprintf("%s wants to connect with you", requester.Username),
		RelatedUserID: uuid.NullUUID{UUID: authPayload.ID, Valid: true},
	})
	if err != nil {
		log.Error().Err(err).Msg("failed to create connection request notification")
	}

	ctx.JSON(http.StatusCreated, conn)
}

type updateConnectionRequest struct {
	RequesterID string `json:"requester_id" binding:"required,uuid"`
	Status      string `json:"status" binding:"required,oneof=accepted blocked"`
}

func (server *Server) updateConnection(ctx *gin.Context) {
	var req updateConnectionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	requesterID, _ := uuid.Parse(req.RequesterID)
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)
    
	conn, err := server.store.UpdateConnectionStatus(ctx, db.UpdateConnectionStatusParams{
		RequesterID: requesterID,
		TargetID:    authPayload.ID, // I am the target accepting the request
		Status:      db.ConnectionStatus(req.Status),
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}
	
	// Create notification if connection was accepted
	if req.Status == "accepted" {
		accepter, err := server.store.GetUserByID(ctx, authPayload.ID)
		if err == nil {
			_, err = server.store.CreateNotification(ctx, db.CreateNotificationParams{
				UserID:        requesterID,
				Type:          "connection_accepted",
				Title:         "Connection Accepted",
				Message:       fmt.Sprintf("%s accepted your connection request", accepter.Username),
				RelatedUserID: uuid.NullUUID{UUID: authPayload.ID, Valid: true},
			})
			if err != nil {
				log.Error().Err(err).Msg("failed to create connection accepted notification")
			}
		}
	}

	ctx.JSON(http.StatusOK, conn)
}

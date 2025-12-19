package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mmcloughlin/geohash"
	"github.com/rs/zerolog/log"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

const (
	locationPrecision = 7                // +/- 76m approx
	bucketDuration    = 10 * time.Minute // 10 min time buckets
	locationTTL       = 24 * time.Hour
)

type updateLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude float64 `json:"longitude" binding:"required,min=-180,max=180"`
}

func (server *Server) updateLocation(ctx *gin.Context) {
	var req updateLocationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Privacy: Convert to Geohash
	hash := geohash.Encode(req.Latitude, req.Longitude)
	if len(hash) > locationPrecision {
		hash = hash[:locationPrecision]
	}

	// Safety Check: Fake GPS
	val := server.safety.ValidateUserMovement(ctx, authPayload.UserID.String(), req.Latitude, req.Longitude)
	if !val.Allowed {
		if val.ShouldBan {
			server.store.BanUser(ctx, db.BanUserParams{
				ID:             authPayload.UserID,
				IsShadowBanned: true,
			})
			log.Warn().Str("user_id", authPayload.UserID.String()).Msg("User shadow-banned for fake GPS")
		}
		// Return success to maintain illusion, but do NOT save the fake location
		ctx.JSON(http.StatusOK, gin.H{"status": "updated"})
		return
	}

	// Privacy: Time Bucket
	now := time.Now().UTC()
	bucketTime := now.Truncate(bucketDuration)

	// Privacy: Expiry
	expiresAt := now.Add(locationTTL)

	_, err := server.store.CreateLocation(ctx, db.CreateLocationParams{
		UserID:     authPayload.UserID,
		Geohash:    hash,
		Lng:        req.Longitude, // @lng
		Lat:        req.Latitude,  // @lat
		TimeBucket: bucketTime,
		ExpiresAt:  expiresAt,
	})

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Update user activity (for visibility system)
	_, err = server.store.UpdateUserActivity(ctx, authPayload.UserID)
	if err != nil {
		// Log error but don't fail the request
		log.Error().Err(err).Msg("Failed to update user activity on location ping")
	}

	// Trigger Redis Geo Crossing Detection (synchronous - Redis is fast)
	if err := server.location.UpdateUserLocation(ctx, authPayload.UserID, req.Latitude, req.Longitude); err != nil {
		log.Error().Err(err).Msg("Failed to update redis location service")
	}

	ctx.JSON(http.StatusOK, gin.H{"status": "updated"})
}

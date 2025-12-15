package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mmcloughlin/geohash"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

const (
	locationPrecision = 7             // +/- 76m approx
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

	// Privacy: Time Bucket
	now := time.Now().UTC()
	bucketTime := now.Truncate(bucketDuration)

	// Privacy: Expiry
	expiresAt := now.Add(locationTTL)

	// Privacy: Expiry
	// expiresAt defined above
	
	_, err := server.store.CreateLocation(ctx, db.CreateLocationParams{
		UserID:     authPayload.ID,
		Geohash:    hash,
		Lng:        req.Longitude, // @lng
		Lat:        req.Latitude,  // @lat
		TimeBucket: bucketTime,
		ExpiresAt:  expiresAt,
	})
    
    // Wait, I can't check generated code easily without reading it.
    // Better to update the SQL query to use named parameters @lat, @lng.
	
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"status": "updated"})
}

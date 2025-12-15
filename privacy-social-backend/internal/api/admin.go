package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"privacy-social-backend/internal/repository/db"
)

const (
	adminStatsCacheTTL = 1 * time.Minute
)

// Admin: List Users
type listUsersRequest struct {
	PageID   int32 `form:"page" binding:"required,min=1"`
	PageSize int32 `form:"page_size" binding:"required,min=5,max=100"`
}

func (server *Server) listUsers(ctx *gin.Context) {
	var req listUsersRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	users, err := server.store.ListUsers(ctx, db.ListUsersParams{
		Limit:  req.PageSize,
		Offset: (req.PageID - 1) * req.PageSize,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	count, err := server.store.CountUsers(ctx)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": count,
		"page":  req.PageID,
	})
}

// Admin: Ban/Unban User
type banUserRequest struct {
	UserID string `json:"user_id" binding:"required,uuid"`
	Ban    bool   `json:"ban" binding:"required"`
}

func (server *Server) banUser(ctx *gin.Context) {
	var req banUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	userID, _ := uuid.Parse(req.UserID)

	user, err := server.store.BanUser(ctx, db.BanUserParams{
		ID:              userID,
		IsShadowBanned: req.Ban,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// Admin: Delete User
type deleteUserRequest struct {
	UserID string `uri:"id" binding:"required,uuid"`
}

func (server *Server) deleteUser(ctx *gin.Context) {
	var req deleteUserRequest
	if err := ctx.ShouldBindUri(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	userID, _ := uuid.Parse(req.UserID)

	err := server.store.DeleteUser(ctx, userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

// Admin: Get Statistics (with Redis caching)
func (server *Server) getStats(ctx *gin.Context) {
	cacheKey := "admin:stats"

	// Try cache first
	cachedData, err := server.redis.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	// Cache miss - query database
	userStats, err := server.store.GetUserStats(ctx)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	storyStats, err := server.store.GetStoryStats(ctx)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Fetch Analytics (North Star)
    retention, err := server.store.GetStreakRetentionStats(ctx)
    if err != nil {
        // Log but don't fail, maybe just return zeroes
    }
    engagement, err := server.store.GetEngagementStats(ctx)
    if err != nil {}
    conversion, err := server.store.GetConversionStats(ctx)
    if err != nil {}

	response := gin.H{
		"users":   userStats,
		"stories": storyStats,
        "analytics": gin.H{
            "retention_rate_3d": retention.RetentionRate,
            "retained_users_count": retention.RetainedUsersCount,
            "weekly_stories_per_user": engagement.AvgStoriesPerUserWeekly,
            "crossing_conversion_rate": conversion.CrossingConversionRate,
        },
	}

	// Cache for 1 minute
	responseJSON, _ := json.Marshal(response)
	server.redis.Set(ctx, cacheKey, responseJSON, adminStatsCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, response)
}

// Admin: List Reports
type listReportsRequest struct {
	Resolved bool  `form:"resolved"`
	PageID   int32 `form:"page" binding:"required,min=1"`
	PageSize int32 `form:"page_size" binding:"required,min=5,max=100"`
}

func (server *Server) listReports(ctx *gin.Context) {
	var req listReportsRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	reports, err := server.store.ListReports(ctx, db.ListReportsParams{
		IsResolved: req.Resolved,
		Limit:      req.PageSize,
		Offset:     (req.PageID - 1) * req.PageSize,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, reports)
}

// Admin: Resolve Report
type resolveReportRequest struct {
	ReportID string `uri:"id" binding:"required,uuid"`
}

func (server *Server) resolveReport(ctx *gin.Context) {
	var req resolveReportRequest
	if err := ctx.ShouldBindUri(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	reportID, _ := uuid.Parse(req.ReportID)

	report, err := server.store.ResolveReport(ctx, reportID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, report)
}

// Admin: Delete Story
type deleteStoryRequest struct {
	StoryID string `uri:"id" binding:"required,uuid"`
}

func (server *Server) deleteStory(ctx *gin.Context) {
	var req deleteStoryRequest
	if err := ctx.ShouldBindUri(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	storyID, _ := uuid.Parse(req.StoryID)

	err := server.store.DeleteStory(ctx, storyID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate feed cache when story is deleted
	server.redis.Del(ctx, "feed:*")

	ctx.JSON(http.StatusOK, gin.H{"message": "story deleted"})
}

// Admin: List All Stories
type listAllStoriesRequest struct {
	PageID   int32 `form:"page" binding:"required,min=1"`
	PageSize int32 `form:"page_size" binding:"required,min=5,max=100"`
}

func (server *Server) listAllStories(ctx *gin.Context) {
	var req listAllStoriesRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	stories, err := server.store.ListAllStories(ctx, db.ListAllStoriesParams{
		Limit:  req.PageSize,
		Offset: (req.PageID - 1) * req.PageSize,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, stories)
}

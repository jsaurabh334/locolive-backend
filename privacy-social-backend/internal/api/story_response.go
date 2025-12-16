package api

import (
	"time"

	"privacy-social-backend/internal/repository/db"

	"github.com/google/uuid"
)

// StoryResponse is the DTO for story API responses
type StoryResponse struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	MediaURL     string    `json:"media_url"`
	MediaType    string    `json:"media_type"`
	ThumbnailURL *string   `json:"thumbnail_url"`
	Caption      *string   `json:"caption"`
	Geohash      string    `json:"geohash"`
	Visibility   string    `json:"visibility"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	IsAnonymous  bool      `json:"is_anonymous"`
	IsPremium    *bool     `json:"is_premium"`
	Username     string    `json:"username"`
	AvatarURL    *string   `json:"avatar_url"`
}

// Convert db.GetStoriesWithinRadiusRow to StoryResponse
func toStoryResponse(row db.GetStoriesWithinRadiusRow) StoryResponse {
	resp := StoryResponse{
		ID:          row.ID,
		UserID:      row.UserID,
		MediaURL:    row.MediaUrl,
		MediaType:   row.MediaType,
		Geohash:     row.Geohash,
		Visibility:  string(row.Visibility),
		ExpiresAt:   row.ExpiresAt,
		CreatedAt:   row.CreatedAt,
		IsAnonymous: row.IsAnonymous,
		Username:    row.Username,
	}

	if row.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &row.ThumbnailUrl.String
	}

	if row.Caption.Valid {
		resp.Caption = &row.Caption.String
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}

	if row.IsPremium.Valid {
		resp.IsPremium = &row.IsPremium.Bool
	}

	return resp
}

// Convert db.GetConnectionStoriesRow to StoryResponse
func toStoryResponseFromConnection(row db.GetConnectionStoriesRow) StoryResponse {
	resp := StoryResponse{
		ID:          row.ID,
		UserID:      row.UserID,
		MediaURL:    row.MediaUrl,
		MediaType:   row.MediaType,
		Geohash:     row.Geohash,
		Visibility:  string(row.Visibility),
		ExpiresAt:   row.ExpiresAt,
		CreatedAt:   row.CreatedAt,
		IsAnonymous: row.IsAnonymous,
		Username:    row.Username,
	}

	if row.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &row.ThumbnailUrl.String
	}

	if row.Caption.Valid {
		resp.Caption = &row.Caption.String
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}

	if row.IsPremium.Valid {
		resp.IsPremium = &row.IsPremium.Bool
	}

	return resp
}

// Convert db.GetStoriesInBoundsRow to StoryResponse
func toStoryResponseFromBounds(row db.GetStoriesInBoundsRow) StoryResponse {
	resp := StoryResponse{
		ID:          row.ID,
		UserID:      row.UserID,
		MediaURL:    row.MediaUrl,
		MediaType:   row.MediaType,
		Geohash:     row.Geohash,
		Visibility:  string(row.Visibility),
		ExpiresAt:   row.ExpiresAt,
		CreatedAt:   row.CreatedAt,
		IsAnonymous: row.IsAnonymous,
		Username:    row.Username,
	}

	if row.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &row.ThumbnailUrl.String
	}

	if row.Caption.Valid {
		resp.Caption = &row.Caption.String
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}

	return resp
}

// Convert db.Story to StoryResponse (for createStory)
func toStoryResponseFromStory(story db.Story) StoryResponse {
	resp := StoryResponse{
		ID:          story.ID,
		UserID:      story.UserID,
		MediaURL:    story.MediaUrl,
		MediaType:   story.MediaType,
		Geohash:     story.Geohash,
		Visibility:  string(story.Visibility),
		ExpiresAt:   story.ExpiresAt,
		CreatedAt:   story.CreatedAt,
		IsAnonymous: story.IsAnonymous,
		Username:    "", // Not available in Story model
	}

	if story.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &story.ThumbnailUrl.String
	}

	if story.Caption.Valid {
		resp.Caption = &story.Caption.String
	}

	if story.IsPremium.Valid {
		resp.IsPremium = &story.IsPremium.Bool
	}

	return resp
}

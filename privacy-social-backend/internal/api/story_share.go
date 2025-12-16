package api

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

type shareStoryRequest struct {
	StoryID string   `json:"story_id" binding:"required,uuid"`
	UserIDs []string `json:"user_ids" binding:"required,min=1"`
}

// shareStory shares a story to connections via DM
func (server *Server) shareStory(ctx *gin.Context) {
	var req shareStoryRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)
	storyID, _ := uuid.Parse(req.StoryID)

	// Get story to create share message
	story, err := server.store.GetStoryByID(ctx, storyID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "story not found"})
		return
	}

	// Create message for each user
	shareText := "📸 Shared a story with you: " + story.MediaUrl
	successCount := 0

	for _, userIDStr := range req.UserIDs {
		targetUserID, err := uuid.Parse(userIDStr)
		if err != nil {
			continue
		}

		// Create message with story link in content
		_, err = server.store.CreateMessage(ctx, db.CreateMessageParams{
			SenderID:   authPayload.UserID,
			ReceiverID: targetUserID,
			Content:    shareText,
		})
		if err == nil {
			successCount++
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":   "story shared",
		"shared_to": successCount,
	})
}

// parseMentions extracts @username mentions from text
func parseMentions(text string) []string {
	re := regexp.MustCompile(`@(\w+)`)
	matches := re.FindAllStringSubmatch(text, -1)

	mentions := make([]string, 0)
	seen := make(map[string]bool)

	for _, match := range matches {
		if len(match) > 1 {
			username := strings.ToLower(match[1])
			if !seen[username] {
				mentions = append(mentions, username)
				seen[username] = true
			}
		}
	}

	return mentions
}

// createStoryMentions creates mention records for a story
func (server *Server) createStoryMentions(ctx *gin.Context, storyID uuid.UUID, caption string) error {
	if caption == "" {
		return nil
	}

	mentions := parseMentions(caption)
	if len(mentions) == 0 {
		return nil
	}

	for _, username := range mentions {
		// Get user by username
		user, err := server.store.GetUserByUsername(ctx, username)
		if err != nil {
			continue // Skip if user not found
		}

		// Create mention
		_, err = server.store.CreateStoryMention(ctx, db.CreateStoryMentionParams{
			StoryID:         storyID,
			MentionedUserID: user.ID,
		})
		if err != nil {
			continue // Skip on error
		}

		// TODO: Send notification to mentioned user
	}

	return nil
}

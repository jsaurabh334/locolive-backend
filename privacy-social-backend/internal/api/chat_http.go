package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

const chatCacheTTL = 10 * time.Minute

// checkConnection verifies that two users have an accepted connection AND no blocks exist
func (server *Server) checkConnection(ctx context.Context, userID1, userID2 uuid.UUID) error {
	// 1. Check for blocking (bi-directional)
	// We need to check BOTH directions: userID1 blocks userID2 OR userID2 blocks userID1.

	// Check if userID2 (target) blocked userID1 (requester) - Crucial for privacy
	isBlockedByTarget, err := server.store.IsUserBlocked(ctx, db.IsUserBlockedParams{
		BlockerID: userID2,
		BlockedID: userID1,
	})
	if err != nil {
		return err
	}
	if isBlockedByTarget {
		return sql.ErrNoRows // Treat as no connection (invisible)
	}

	// Check if userID1 (requester) blocked userID2 (target) - Usually UI prevents this, but API should too
	isBlockedByRequester, err := server.store.IsUserBlocked(ctx, db.IsUserBlockedParams{
		BlockerID: userID1,
		BlockedID: userID2,
	})
	if err != nil {
		return err
	}
	if isBlockedByRequester {
		return sql.ErrNoRows
	}

	// 2. Check Connection Status
	conn, err := server.store.GetConnection(ctx, db.GetConnectionParams{
		RequesterID: userID1,
		TargetID:    userID2,
	})
	if err != nil {
		return err
	}
	if conn.Status != "accepted" {
		return sql.ErrNoRows
	}

	// 3. Check Privacy Settings (Who Can Message) of Target (userID2)
	// Only if strictly messaging logic is needed here. But checkConnection is used for GetChatHistory too.
	// We probably want to allow seeing history even if settings change?
	// But usually if someone says "Nobody can message me", they shouldn't receive NEW messages.
	// Reading old ones might be ok.
	// Let's enforce "Who Can Message" only in sendMessage, or purely here?
	// If I set "Nobody", I probably don't want to be bothered properly.

	// Let's fetch settings for target
	settings, err := server.store.GetPrivacySettings(ctx, userID2)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	// Default to connections if no settings
	whoCanMessage := "connections"
	if err == nil && settings.WhoCanMessage.Valid {
		whoCanMessage = settings.WhoCanMessage.String
	}

	if whoCanMessage == "nobody" {
		return sql.ErrNoRows // Block access
	}
	// "connections" is already satisfied by step 2.
	// "everyone" is also satisfied (since we enforce connection anyway for now).

	return nil
}

// API to get chat history
func (server *Server) getChatHistory(ctx *gin.Context) {
	targetIDStr := ctx.Query("user_id")
	targetID, ok := parseUUIDParam(ctx, targetIDStr, "user_id")
	if !ok {
		return
	}
	authPayload := getAuthPayload(ctx)

	// Check for mutual connection
	if err := server.checkConnection(ctx, authPayload.UserID, targetID); err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "You must be connected to this user to chat."})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Create cache key with sorted IDs for consistency
	ids := []string{authPayload.UserID.String(), targetID.String()}
	sort.Strings(ids)
	cacheKey := "messages:" + ids[0] + ":" + ids[1]

	// Try Redis cache first
	cachedData, err := server.redis.Get(context.Background(), cacheKey).Result()
	if err == nil && cachedData != "" {
		ctx.Header("X-Cache", "HIT")
		ctx.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	msgs, err := server.store.ListMessages(ctx, db.ListMessagesParams{
		SenderID:   authPayload.UserID,
		ReceiverID: targetID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Map to response struct to ensure Reactions are valid JSON, not Base64
	type MessageResponse struct {
		ID         uuid.UUID       `json:"id"`
		SenderID   uuid.UUID       `json:"sender_id"`
		ReceiverID uuid.UUID       `json:"receiver_id"`
		Content    string          `json:"content"`
		IsRead     bool            `json:"is_read"`
		CreatedAt  time.Time       `json:"created_at"`
		ReadAt     sql.NullTime    `json:"read_at"`
		ExpiresAt  sql.NullTime    `json:"expires_at"`
		Reactions  json.RawMessage `json:"reactions"`
	}

	responseMsgs := make([]MessageResponse, len(msgs))
	for i, m := range msgs {
		var reactionsJSON json.RawMessage
		if m.Reactions != nil {
			switch v := m.Reactions.(type) {
			case []byte:
				reactionsJSON = json.RawMessage(v)
			case string:
				reactionsJSON = json.RawMessage(v)
			default:
				reactionsJSON = []byte("[]")
			}
		} else {
			reactionsJSON = []byte("[]")
		}

		responseMsgs[i] = MessageResponse{
			ID:         m.ID,
			SenderID:   m.SenderID,
			ReceiverID: m.ReceiverID,
			Content:    m.Content,
			IsRead:     m.IsRead,
			CreatedAt:  m.CreatedAt,
			ReadAt:     m.ReadAt,
			ExpiresAt:  m.ExpiresAt,
			Reactions:  reactionsJSON,
		}
	}

	// Cache the result
	responseJSON, _ := json.Marshal(responseMsgs)
	server.redis.Set(context.Background(), cacheKey, responseJSON, chatCacheTTL)

	ctx.Header("X-Cache", "MISS")
	ctx.Data(http.StatusOK, "application/json", responseJSON)
}

// REST API helper to send a message
type sendMessageRequest struct {
	ReceiverID       uuid.UUID `json:"receiver_id" binding:"required"`
	Content          string    `json:"content" binding:"required"`
	ExpiresInSeconds int64     `json:"expires_in_seconds"` // Optional
}

func (server *Server) sendMessage(ctx *gin.Context) {
	var req sendMessageRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := getAuthPayload(ctx)

	// Check for mutual connection before sending
	if err := server.checkConnection(ctx, authPayload.UserID, req.ReceiverID); err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "You must be connected to this user to send messages."})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Handle expiry
	var expiresAt sql.NullTime
	if req.ExpiresInSeconds > 0 {
		expiresAt = sql.NullTime{
			Time:  time.Now().UTC().Add(time.Duration(req.ExpiresInSeconds) * time.Second),
			Valid: true,
		}
	}

	msg, err := server.store.CreateMessage(ctx, db.CreateMessageParams{
		SenderID:   authPayload.UserID,
		ReceiverID: req.ReceiverID,
		Content:    req.Content,
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache for this conversation
	server.invalidateConversationCache(authPayload.UserID, req.ReceiverID)

	// Update Unread Count Cache for Receiver
	server.incrementUnreadCount(req.ReceiverID)

	// Send real-time notification to receiver via WebSocket
	wsMsg := WSMessage{
		Type:      "new_message",
		Payload:   msg,
		SenderID:  authPayload.UserID,
		CreatedAt: msg.CreatedAt,
	}
	wsMsgBytes, _ := json.Marshal(wsMsg)
	server.hub.SendToUser(req.ReceiverID, wsMsgBytes)

	// Also send to SENDER so their client can update the messages list
	server.hub.SendToUser(authPayload.UserID, wsMsgBytes)

	ctx.JSON(http.StatusCreated, msg)
}

// deleteMessage allows a user to unsend/delete their own message
func (server *Server) deleteMessage(ctx *gin.Context) {
	messageIDStr := ctx.Param("id")
	messageID, ok := parseUUIDParam(ctx, messageIDStr, "message_id")
	if !ok {
		return
	}

	authPayload := getAuthPayload(ctx)

	// Get the message first to find the receiver for cache invalidation
	msg, err := server.store.GetMessage(ctx, messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Verify sender owns the message
	if msg.SenderID != authPayload.UserID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own messages"})
		return
	}

	// Delete the message
	err = server.store.DeleteMessage(ctx, db.DeleteMessageParams{
		ID:       messageID,
		SenderID: authPayload.UserID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache
	server.invalidateConversationCache(msg.SenderID, msg.ReceiverID)

	// Notify receiver via WebSocket
	server.sendWSNotification(msg.ReceiverID, "message_deleted", gin.H{"message_id": messageID})

	ctx.JSON(http.StatusOK, gin.H{"message": "Message deleted"})
}

// editMessageRequest defines the request body for editing a message
type editMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// editMessage allows a user to edit their own message
func (server *Server) editMessage(ctx *gin.Context) {
	messageIDStr := ctx.Param("id")
	messageID, ok := parseUUIDParam(ctx, messageIDStr, "message_id")
	if !ok {
		return
	}

	var req editMessageRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := getAuthPayload(ctx)

	// Get the message first to find the receiver for cache invalidation
	originalMsg, err := server.store.GetMessage(ctx, messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Verify sender owns the message
	if originalMsg.SenderID != authPayload.UserID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You can only edit your own messages"})
		return
	}

	// Update the message
	updatedMsg, err := server.store.UpdateMessage(ctx, db.UpdateMessageParams{
		ID:       messageID,
		SenderID: authPayload.UserID,
		Content:  req.Content,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache
	server.invalidateConversationCache(originalMsg.SenderID, originalMsg.ReceiverID)

	// Notify receiver via WebSocket
	server.sendWSNotification(originalMsg.ReceiverID, "message_edited", updatedMsg)

	ctx.JSON(http.StatusOK, updatedMsg)
}

// markConversationRead marks all messages from a user as read
func (server *Server) markConversationRead(ctx *gin.Context) {
	senderIDStr := ctx.Param("userId")
	senderID, ok := parseUUIDParam(ctx, senderIDStr, "user_id")
	if !ok {
		return
	}

	authPayload := getAuthPayload(ctx)

	err := server.store.MarkConversationRead(ctx, db.MarkConversationReadParams{
		ReceiverID: authPayload.UserID,
		SenderID:   senderID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache
	server.invalidateConversationCache(authPayload.UserID, senderID)

	// Clear Unread Count Cache for Reader (User)
	server.invalidateUnreadCountCache(authPayload.UserID)

	// Notify sender that their messages were read
	wsMsg := WSMessage{
		Type: "messages_read",
		Payload: gin.H{
			"reader_id": authPayload.UserID,
			"sender_id": senderID,
		},
	}
	wsMsgBytes, _ := json.Marshal(wsMsg)
	server.hub.SendToUser(senderID, wsMsgBytes)

	// Notify Self (Reader) to update badges on other devices
	server.hub.SendToUser(authPayload.UserID, wsMsgBytes)

	ctx.JSON(http.StatusOK, gin.H{"message": "Conversation marked as read"})
}

// Reaction request body
type reactionRequest struct {
	Emoji string `json:"emoji" binding:"required"`
}

// addReaction adds a reaction to a message
func (server *Server) addReaction(ctx *gin.Context) {
	messageIDStr := ctx.Param("id")
	messageID, err := uuid.Parse(messageIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var req reactionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Get the message to find the other user
	msg, err := server.store.GetMessage(ctx, messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	reaction, err := server.store.CreateMessageReaction(ctx, db.CreateMessageReactionParams{
		MessageID: messageID,
		UserID:    authPayload.UserID,
		Emoji:     req.Emoji,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache
	ids := []string{msg.SenderID.String(), msg.ReceiverID.String()}
	sort.Strings(ids)
	cacheKey := "messages:" + ids[0] + ":" + ids[1]
	server.redis.Del(context.Background(), cacheKey)

	// Notify the other user
	otherUserID := msg.SenderID
	if msg.SenderID == authPayload.UserID {
		otherUserID = msg.ReceiverID
	}

	wsMsg := WSMessage{
		Type: "reaction_added",
		Payload: gin.H{
			"message_id": messageID,
			"user_id":    authPayload.UserID,
			"emoji":      req.Emoji,
		},
	}
	wsMsgBytes, _ := json.Marshal(wsMsg)
	server.hub.SendToUser(otherUserID, wsMsgBytes)

	ctx.JSON(http.StatusCreated, reaction)
}

// removeReaction removes a reaction from a message
func (server *Server) removeReaction(ctx *gin.Context) {
	messageIDStr := ctx.Param("id")
	messageID, err := uuid.Parse(messageIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var req reactionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(err))
		return
	}

	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Get the message to find the other user
	msg, err := server.store.GetMessage(ctx, messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	err = server.store.DeleteMessageReaction(ctx, db.DeleteMessageReactionParams{
		MessageID: messageID,
		UserID:    authPayload.UserID,
		Emoji:     req.Emoji,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Notify the other user
	otherUserID := msg.SenderID
	if msg.SenderID == authPayload.UserID {
		otherUserID = msg.ReceiverID
	}

	wsMsg := WSMessage{
		Type: "reaction_removed",
		Payload: gin.H{
			"message_id": messageID,
			"user_id":    authPayload.UserID,
			"emoji":      req.Emoji,
		},
	}
	wsMsgBytes, _ := json.Marshal(wsMsg)
	server.hub.SendToUser(otherUserID, wsMsgBytes)

	ctx.JSON(http.StatusOK, gin.H{"message": "Reaction removed"})
}

// getMessageReactions gets all reactions for a message
func (server *Server) getMessageReactions(ctx *gin.Context) {
	messageIDStr := ctx.Param("id")
	messageID, err := uuid.Parse(messageIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	reactions, err := server.store.GetMessageReactions(ctx, messageID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	ctx.JSON(http.StatusOK, reactions)
}

// getUnreadMessageCount returns the total number of unread messages for the user
func (server *Server) getUnreadMessageCount(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)

	// Try Redis first
	cacheKey := "unread_count:" + authPayload.UserID.String()
	cachedCount, err := server.redis.Get(context.Background(), cacheKey).Int64()
	if err == nil {
		ctx.Header("X-Cache", "HIT")
		ctx.JSON(http.StatusOK, gin.H{"count": cachedCount})
		return
	}

	count, err := server.store.GetUnreadMessageCount(ctx, authPayload.UserID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}
	// Cache the result
	server.redis.Set(context.Background(), cacheKey, count, 30*time.Minute)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, gin.H{"unread_count": count})
}

// getConversationList returns list of conversations sorted by most recent message
func (server *Server) getConversationList(ctx *gin.Context) {
	authPayload := getAuthPayload(ctx)

	conversations, err := server.store.GetConversationList(ctx, authPayload.UserID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Convert to response format
	type ConversationResponse struct {
		ID            uuid.UUID `json:"id"`
		Username      string    `json:"username"`
		FullName      string    `json:"full_name"`
		AvatarUrl     string    `json:"avatar_url"`
		LastMessage   string    `json:"last_message"`
		LastMessageAt time.Time `json:"last_message_at"`
		LastSenderID  uuid.UUID `json:"last_sender_id"`
		UnreadCount   int64     `json:"unread_count"`
	}

	response := make([]ConversationResponse, len(conversations))
	for i, conv := range conversations {
		unreadCount := int64(0)
		if count, ok := conv.UnreadCount.(int64); ok {
			unreadCount = count
		}

		response[i] = ConversationResponse{
			ID:            conv.ID,
			Username:      conv.Username,
			FullName:      conv.FullName,
			AvatarUrl:     conv.AvatarUrl.String,
			LastMessage:   conv.LastMessage,
			LastMessageAt: conv.LastMessageAt,
			LastSenderID:  conv.LastSenderID,
			UnreadCount:   unreadCount,
		}
	}

	ctx.JSON(http.StatusOK, response)
}

// deleteConversation deletes all messages between the authenticated user and another user
func (server *Server) deleteConversation(ctx *gin.Context) {
	userIDStr := ctx.Param("userId")
	userID, ok := parseUUIDParam(ctx, userIDStr, "user_id")
	if !ok {
		return
	}

	authPayload := getAuthPayload(ctx)

	// Delete all messages in the conversation
	err := server.store.DeleteConversation(ctx, db.DeleteConversationParams{
		SenderID:   authPayload.UserID,
		ReceiverID: userID,
	})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(err))
		return
	}

	// Invalidate cache
	server.invalidateConversationCache(authPayload.UserID, userID)
	server.invalidateUnreadCountCache(authPayload.UserID)

	ctx.JSON(http.StatusOK, gin.H{"message": "conversation deleted"})
}

package api

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"privacy-social-backend/internal/repository/db"
	"privacy-social-backend/internal/token"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for dev
	},
}

// Basic WebSocket implementation (No full Hub struct for brevity, just per-connection loop)
// For production, use a proper Hub to manage connections.

func (server *Server) chatWebSocket(ctx *gin.Context) {
	authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)
    
    // Upgrade HTTP to WS
	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		log.Printf("Failed to set websocket upgrade: %v", err)
		return
	}
	defer conn.Close()
    
    // Register user in a Hub (Global in server?)
    // For now simple ECHO + Persist logic loop
    
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("ws read error:", err)
			break
		}
        
        // Assume message is JSON with {receiver_id, content}
        // or just content if strictly 1-1 chat endpoint? 
        // Ideally the WS endpoint is global and messages contain metadata.
        
        // Simple Stub: Assume format "receiver_uuid:content"
        // In real app, unmarshal JSON.
        
        // Just persisting a dummy message to show flow
        log.Printf("Received: %s from %s", message, authPayload.Username)
        
        // TODO: Parse message, find receiver ID, Save to DB.
        
        // Example:
        // server.store.CreateMessage(ctx, db.CreateMessageParams{...})
	}
}

// API to get chat history
func (server *Server) getChatHistory(ctx *gin.Context) {
    targetIDStr := ctx.Query("user_id")
    targetID, _ := uuid.Parse(targetIDStr)
    authPayload := ctx.MustGet(authorizationPayloadKey).(*token.Payload)
    
    msgs, err := server.store.ListMessages(ctx, db.ListMessagesParams{
        SenderID: authPayload.ID,
        ReceiverID: targetID,
    })
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, errorResponse(err))
        return
    }
    
    ctx.JSON(http.StatusOK, msgs)
}

package api

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Client represents a connected user
type Client struct {
	Hub      *Hub
	UserID   uuid.UUID
	Conn     *websocket.Conn
	Send     chan []byte
	Username string
}

// Hub maintains the set of active clients and broadcasts messages to the
type Hub struct {
	// Registered clients map[UserID]Client
	// We use a map of maps to allow multiple connections per user (e.g. phone + laptop)
	clients    map[uuid.UUID]map[*Client]bool
	broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mutex      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		clients:    make(map[uuid.UUID]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			if _, ok := h.clients[client.UserID]; !ok {
				h.clients[client.UserID] = make(map[*Client]bool)
			}
			h.clients[client.UserID][client] = true
			h.mutex.Unlock()
			log.Printf("Client registered: %s", client.Username)

		case client := <-h.Unregister:
			h.mutex.Lock()
			if userClients, ok := h.clients[client.UserID]; ok {
				if _, ok := userClients[client]; ok {
					delete(userClients, client)
					close(client.Send)
					if len(userClients) == 0 {
						delete(h.clients, client.UserID)
					}
				}
			}
			h.mutex.Unlock()
			log.Printf("Client unregistered: %s", client.Username)
		}
	}
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID uuid.UUID, message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if clients, ok := h.clients[userID]; ok {
		for client := range clients {
			select {
			case client.Send <- message:
			default:
				close(client.Send)
				delete(clients, client)
			}
		}
	}
}

// WSMessage defines the structure of WebSocket messages
type WSMessage struct {
	Type      string      `json:"type"` // "new_message", "typing", etc.
	Payload   interface{} `json:"payload"`
	SenderID  uuid.UUID   `json:"sender_id,omitempty"`
	CreatedAt time.Time   `json:"created_at,omitempty"`
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second) // Ping period
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second)) // Write wait
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(4096)                                // Max message size
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second)) // Pong wait
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Handle typing indicator messages
		var wsMsg struct {
			Type       string    `json:"type"`
			ReceiverID uuid.UUID `json:"receiver_id"`
		}
		if err := json.Unmarshal(message, &wsMsg); err == nil {
			if wsMsg.Type == "typing" {
				// Forward typing indicator to the receiver
				typingMsg := WSMessage{
					Type: "typing",
					Payload: map[string]interface{}{
						"user_id":  c.UserID,
						"username": c.Username,
					},
				}
				typingBytes, _ := json.Marshal(typingMsg)
				c.Hub.SendToUser(wsMsg.ReceiverID, typingBytes)
			}
		}
	}
}

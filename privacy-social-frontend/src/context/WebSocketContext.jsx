import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const wsRef = useRef(null);
    const queryClient = useQueryClient();

    // Connect to WebSocket
    useEffect(() => {
        if (!token) return;

        let reconnectTimeout;
        let connectionTimeout;
        let isUnmounted = false;
        let ws = null;

        const connect = () => {
            if (isUnmounted) return;

            // Close existing if any
            if (wsRef.current) {
                wsRef.current.close();
            }

            const wsUrl = `ws://localhost:8080/ws/chat?token=${token}`;
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmounted) {
                    ws.close();
                    return;
                }
                console.log('Global WebSocket Connected');
                setSocket(ws);
            };

            ws.onmessage = (event) => {
                if (isUnmounted) return;

                // Ignore ping/pong messages (they're handled automatically)
                if (typeof event.data !== 'string' || event.data === '') {
                    return;
                }

                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);

                    // Global Event Handlers
                    switch (data.type) {
                        case 'new_message':
                            queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
                            // Invalidate specific message query
                            if (data.payload && user?.id) {
                                const partnerId = data.payload.sender_id === user.id ? data.payload.receiver_id : data.payload.sender_id;
                                queryClient.invalidateQueries({ queryKey: ['messages', partnerId] });
                            }
                            break;

                        case 'messages_read':
                            queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
                            if (data.payload?.reader_id !== user?.id) {
                                queryClient.invalidateQueries({ queryKey: ['messages', data.payload.reader_id] });
                            }
                            break;
                    }

                } catch (e) {
                    console.error('Global WS Parse Error:', e);
                    console.error('Raw message:', event.data);
                }
            };

            ws.onclose = (event) => {
                if (isUnmounted) return;
                if (event.code !== 1000) {
                    console.log('Global WebSocket Disconnected, retrying in 3s...');
                    setSocket(null);
                    wsRef.current = null;
                    reconnectTimeout = setTimeout(connect, 3000);
                } else {
                    setSocket(null);
                    wsRef.current = null;
                }
            };

            ws.onerror = (err) => {
                if (isUnmounted) return;
                console.error('Global WebSocket Error:', err);
            };
        };

        // Delay connection to avoid double-mount issues in Strict Mode
        connectionTimeout = setTimeout(connect, 100);

        return () => {
            isUnmounted = true;
            clearTimeout(reconnectTimeout);
            clearTimeout(connectionTimeout);

            if (ws) {
                // Remove listeners to prevent state updates after unmount
                ws.onclose = null;
                ws.onmessage = null;
                ws.onopen = null;
                ws.onerror = null;
                ws.close();
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setSocket(null);
        };

        // Only reconnect if token changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Helper to send messages
    const sendMessage = useCallback((type, payload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, ...payload }));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }, []);

    return (
        <WebSocketContext.Provider value={{ socket, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

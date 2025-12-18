import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useMessages, useSendMessage, useDeleteMessage, useEditMessage, useMarkConversationRead, useAddReaction, useRemoveReaction, useUploadFile, useConversations, useDeleteConversation, useSaveMessage } from '../features/chat/useChat';
import { useConnections } from '../features/connections/useConnections';
import ChatSidebar from '../features/chat/components/ChatSidebar';
import ChatHeader from '../features/chat/components/ChatHeader';
import MessageList from '../features/chat/components/MessageList';
import MessageInput from '../features/chat/components/MessageInput';
import { cn } from '../utils/cn';
import apiClient from '../api/client'; // Import queryFn helper if needed for direct fetch

const Chat = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();
    const { sendMessage: sendWSMessage, lastMessage } = useWebSocket();

    // State
    const [selectedUser, setSelectedUser] = useState(location.state?.selectedUser || null);
    const [newMessage, setNewMessage] = useState('');
    const [localMessages, setLocalMessages] = useState([]);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [menuOpen, setMenuOpen] = useState(null);
    const [reactionPicker, setReactionPicker] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const [isSecretMode, setIsSecretMode] = useState(false);
    const [mediaAttachment, setMediaAttachment] = useState(null);

    // Refs for safe closures and timers
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const otherTypingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const activeConversationRef = useRef(selectedUser?.id);

    // Update active ref whenever selection changes
    useEffect(() => {
        activeConversationRef.current = selectedUser?.id;
    }, [selectedUser?.id]);

    // Restore selectedUser from URL if missing (Page Refresh)
    useEffect(() => {
        const userIdFromUrl = searchParams.get('userId');
        if (!selectedUser && userIdFromUrl) {
            // Fetch user profile to restore state
            apiClient.getUserProfile(userIdFromUrl)
                .then(res => {
                    setSelectedUser(res.data);
                })
                .catch(err => {
                    console.error("Failed to restore chat user", err);
                    // Optionally navigate away or show error
                });
        }
    }, [selectedUser, searchParams]);

    // Hooks
    const { data: messages, isLoading: loadingMessages, refetch } = useMessages(selectedUser?.id);
    const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } = useConversations();
    const sendMessage = useSendMessage();
    const deleteMessage = useDeleteMessage();
    const editMessage = useEditMessage();
    const markRead = useMarkConversationRead();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    const uploadFile = useUploadFile();
    const deleteConversation = useDeleteConversation();
    const saveMessage = useSaveMessage();

    // Sync remote messages with deduplication and temp-cleanup
    useEffect(() => {
        if (messages) {
            setLocalMessages(prev => {
                const serverMap = new Map(messages.map(m => [String(m.id), m]));

                // Retain messages from prev that are NOT in serverMap (WS ahead of polling)
                // BUT filter out 'temp-' messages from prev. We trust 'messages' for temp state.
                prev.forEach(m => {
                    const strId = String(m.id);
                    // Only keep if it's NOT in server list AND it's NOT a temp message
                    // (Temp messages should strictly come from 'messages' query cache to ensure they are removed when confirmed)
                    if (!serverMap.has(strId) && !strId.startsWith('temp-')) {
                        serverMap.set(strId, m);
                    }
                });

                return Array.from(serverMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
        }
    }, [messages]);

    // WebSocket Handling
    useEffect(() => {
        if (!lastMessage) return;

        try {
            const data = JSON.parse(lastMessage.data);

            // Global Updates (Conversations List)
            // Always refetch conversations for ANY new message to update sidebar (unread count/order)
            if (data.type === 'new_message') {
                refetchConversations();
            }

            // Validate event is for current chat (Local Message List)
            const isRelevant =
                (data.sender_id === activeConversationRef.current) ||
                (data.receiver_id === activeConversationRef.current) ||
                (data.user_id === activeConversationRef.current) || // For typing events sometimes
                (activeConversationRef.current && (data.sender_id === currentUser.id && data.receiver_id === activeConversationRef.current));

            if (!isRelevant && data.type !== 'message_read') return;

            if (data.type === 'new_message' && isRelevant) {
                setLocalMessages(prev => {
                    // Deduplicate
                    if (prev.some(m => m.id === data.id)) return prev;
                    return [...prev, data];
                });

                // Mark read if we are looking at this chat and it's from them
                if (data.sender_id === activeConversationRef.current) {
                    markRead.mutate(activeConversationRef.current);
                }

            } else if (data.type === 'message_read') {
                // If I read it elsewhere, update global list too
                if (data.reader_id === currentUser.id) {
                    refetchConversations();
                }

                if (data.reader_id === activeConversationRef.current) {
                    // Targeted update: Only update specific message or all if logic dictates
                    if (data.message_id) {
                        setLocalMessages(prev => prev.map(msg => msg.id === data.message_id ? { ...msg, read_at: new Date().toISOString() } : msg));
                    } else {
                        // Fallback: update all my messages to this user? (Assuming bulk read)
                    }
                }

            } else if (data.type === 'typing' && data.sender_id === activeConversationRef.current) {
                setOtherTyping(true);
                if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
                otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);

            } else if (data.type === 'message_deleted') {
                setLocalMessages(prev => prev.filter(m => m.id !== data.message_id));

            } else if (data.type === 'message_edited') {
                setLocalMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, content: data.content, is_edited: true } : m));

            } else if (data.type === 'reaction_added') {
                setLocalMessages(prev => prev.map(m => {
                    if (m.id === data.message_id || m.id === parseInt(data.message_id)) {
                        // Prevent duplicate reactions
                        const existing = m.reactions?.some(r => r.emoji === data.emoji && r.user_id === data.user_id);
                        if (existing) return m;
                        return { ...m, reactions: [...(m.reactions || []), { emoji: data.emoji, user_id: data.user_id }] };
                    }
                    return m;
                }));

            } else if (data.type === 'reaction_removed') {
                setLocalMessages(prev => prev.map(m =>
                    (m.id === data.message_id || m.id === parseInt(data.message_id))
                        ? { ...m, reactions: (m.reactions || []).filter(r => !(r.emoji === data.emoji && r.user_id === data.user_id)) }
                        : m
                ));
            }
        } catch (e) {
            // Ignore parse errors
        }
    }, [lastMessage, refetchConversations, markRead, currentUser.id]);

    // Mark read on selection (Optimized)
    useEffect(() => {
        if (selectedUser?.id && messages?.some(m => !m.read_at && m.sender_id === selectedUser.id)) {
            markRead.mutate(selectedUser.id, {
                onSuccess: () => {
                    refetchConversations();
                }
            });
            // Optimistically mark local as read
            setLocalMessages(prev => prev.map(m =>
                m.sender_id === selectedUser.id && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
            ));
        }
    }, [selectedUser?.id, messages]); // Depend on messages to check unread status

    const handleUserSelect = (user) => {
        // Optimistic update for unread count
        queryClient.setQueryData(['conversations'], (old) => {
            if (!old) return old;
            return old.map(c => c.id === user.id ? { ...c, unread_count: 0 } : c);
        });

        setSelectedUser(user);
        // Persist in URL for reliability
        navigate(`/messages?userId=${user.id}`, { state: { selectedUser: user }, replace: true });
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (uploadFile.isPending) {
            alert("Please wait for the file to finish uploading");
            return;
        }
        if ((!newMessage.trim() && !mediaAttachment) || !selectedUser) return;

        const messageData = {
            receiverId: selectedUser.id,
            content: newMessage,
            media_url: mediaAttachment?.url || "",
            media_type: mediaAttachment?.type || ""
        };

        if (isSecretMode) {
            messageData.expires_in_seconds = 86400;
        }

        sendMessage.mutate(messageData, {
            onSuccess: () => {
                setNewMessage('');
                setMediaAttachment(null);
                refetchConversations();
            }
        });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!selectedUser) return;

        if (!isTyping) {
            setIsTyping(true);
            sendWSMessage({ type: 'typing', receiver_id: selectedUser.id });
        }

        // Proper cleanup of previous timer
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
    };

    const handleDelete = (messageId) => {
        deleteMessage.mutate(messageId, {
            onSuccess: () => {
                setLocalMessages(prev => prev.filter(m => m.id !== messageId));
            }
        });
        setMenuOpen(null);
    };

    const handleStartEdit = (msg) => {
        setEditingMessage(msg.id);
        setEditContent(msg.content);
        setMenuOpen(null);
    };

    const handleSaveEdit = (messageId) => {
        if (!editContent.trim()) return;
        editMessage.mutate({ messageId, content: editContent }, {
            onSuccess: () => {
                setLocalMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent, is_edited: true } : m));
                setEditingMessage(null);
            }
        });
    };

    const handleReaction = (messageId, emoji) => {
        addReaction.mutate({ messageId, emoji }, {
            onSuccess: () => {
                setLocalMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        const existing = m.reactions?.some(r => r.emoji === emoji && r.user_id === currentUser.id);
                        if (existing) return m;
                        return { ...m, reactions: [...(m.reactions || []), { emoji, user_id: currentUser.id }] };
                    }
                    return m;
                }));
                setReactionPicker(null);
            }
        });
    };

    const handleDeleteConversation = (userId, e) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
            deleteConversation.mutate(userId, {
                onSuccess: () => {
                    refetchConversations();
                    // Using ref to check if we deleted the active chat
                    if (activeConversationRef.current === userId) {
                        setSelectedUser(null);
                        navigate('/messages');
                    }
                }
            });
        }
    };

    const handleSaveMessage = (messageId) => {
        saveMessage.mutate(messageId, {
            onSuccess: () => {
                setLocalMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, expires_at: null } : m
                ));
            }
        });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return; // Guard

        e.target.value = '';

        const formData = new FormData();
        formData.append('file', file);
        // Bind to active conversation context if needed? 
        // Currently upload is independent but send happens after.

        uploadFile.mutate(formData, {
            onSuccess: (data) => {
                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';

                setMediaAttachment({
                    url: data.data.url,
                    type: type,
                    name: file.name
                });
            },
            onError: () => {
                alert("Failed to upload file");
            }
        });
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        };
    }, []);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setMenuOpen(null);
            setReactionPicker(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
            <div className="flex h-[calc(100vh-64px)] overflow-hidden pt-safe max-w-7xl mx-auto">
                <ChatSidebar
                    conversations={conversations}
                    loadingConversations={loadingConversations}
                    selectedUser={selectedUser}
                    handleUserSelect={handleUserSelect}
                    currentUser={currentUser}
                    handleDeleteConversation={handleDeleteConversation}
                />

                <div className={cn(
                    "flex-1 flex flex-col bg-surface/30 backdrop-blur-md relative",
                    !selectedUser ? "hidden md:flex" : "flex"
                )}>
                    {!selectedUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50 p-6 text-center">
                            <span className="text-6xl mb-4">💬</span>
                            <h3 className="text-xl font-bold mb-2">Select a conversation</h3>
                            <p>Choose a friend from the left to start chatting</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <ChatHeader
                                selectedUser={selectedUser}
                                otherTyping={otherTyping}
                                isSecretMode={isSecretMode}
                                setIsSecretMode={setIsSecretMode}
                                setSelectedUser={setSelectedUser}
                            />

                            <MessageList
                                messages={localMessages}
                                loadingMessages={loadingMessages}
                                currentUser={currentUser}
                                selectedUser={selectedUser}
                                editingMessage={editingMessage}
                                editContent={editContent}
                                setEditContent={setEditContent}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={() => setEditingMessage(null)}
                                onStartEdit={handleStartEdit}
                                onDelete={handleDelete}
                                onReaction={handleReaction}
                                onSaveMessage={handleSaveMessage}
                                menuOpen={menuOpen}
                                setMenuOpen={setMenuOpen}
                                reactionPicker={reactionPicker}
                                setReactionPicker={setReactionPicker}
                                otherTyping={otherTyping}
                                onPoke={() => {
                                    // Send a poke message
                                    const pokeMessage = {
                                        receiverId: selectedUser.id,
                                        content: `${currentUser.full_name || currentUser.username} poked you 👋`,
                                        media_url: "",
                                        media_type: ""
                                    };
                                    sendMessage.mutate(pokeMessage, {
                                        onSuccess: () => {
                                            refetchConversations();
                                        }
                                    });
                                }}
                            />

                            <MessageInput
                                newMessage={newMessage}
                                setNewMessage={setNewMessage}
                                onSend={handleSend}
                                handleTyping={handleTyping}
                                inputRef={inputRef}
                                fileInputRef={fileInputRef}
                                handleFileSelect={handleFileSelect}
                                uploadFile={uploadFile}
                                sendMessage={sendMessage}
                                mediaAttachment={mediaAttachment}
                                setMediaAttachment={setMediaAttachment}
                                reactionPicker={reactionPicker}
                                setReactionPicker={setReactionPicker}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Chat;

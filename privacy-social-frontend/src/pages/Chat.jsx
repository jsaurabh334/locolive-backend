import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useMessages, useSendMessage, useDeleteMessage, useEditMessage, useMarkConversationRead, useAddReaction, useRemoveReaction, useUploadFile, useConversations, useDeleteConversation } from '../features/chat/useChat';
import { useConnections } from '../features/connections/useConnections';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import Loader from '../components/ui/Loader';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '../utils/cn';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const Chat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser } = useAuth();
    const { sendMessage: sendWSMessage, lastMessage } = useWebSocket();
    const queryClient = useQueryClient();

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

    // Hooks
    const { data: connections, isLoading: loadingConnections } = useConnections();
    const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } = useConversations();
    // Hooks
    const { data: serverMessages, isLoading: loadingMessages, refetch } = useMessages(selectedUser?.id);
    const sendMessage = useSendMessage();

    const deleteMessage = useDeleteMessage();
    const editMessage = useEditMessage();
    const markRead = useMarkConversationRead();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    const uploadFile = useUploadFile();
    const deleteConversation = useDeleteConversation();

    // Refs
    // wsRef removed as we use context
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const hasMarkedReadRef = useRef(false);

    // Sync server messages to local state
    useEffect(() => {
        if (serverMessages) {
            setLocalMessages(serverMessages);
        }
    }, [serverMessages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [localMessages, otherTyping]);

    // Mark conversation as read when selecting user (once per selection)
    useEffect(() => {
        if (selectedUser?.id && !hasMarkedReadRef.current) {
            markRead.mutate({ userId: selectedUser.id });
            hasMarkedReadRef.current = true;
        }
        // Reset flag when user changes
        return () => {
            hasMarkedReadRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser?.id]); // Only depend on selectedUser.id, not markRead

    // Handle incoming messages via Global WebSocket Context
    useEffect(() => {
        if (!lastMessage) return;

        const data = lastMessage;
        switch (data.type) {
            case 'new_message':
                const msg = data.payload;
                if (selectedUser && (msg.sender_id === selectedUser.id || msg.receiver_id === selectedUser.id)) {
                    setLocalMessages(prev => {
                        // Prevent duplicates
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    // Mark as read if we're viewing this conversation
                    if (msg.sender_id === selectedUser.id) {
                        markRead.mutate({ userId: selectedUser.id });
                    }
                }
                break;
            case 'message_deleted':
                setLocalMessages(prev => prev.filter(m => m.id !== data.payload.message_id));
                break;
            case 'message_edited':
                setLocalMessages(prev => prev.map(m => m.id === data.payload.id ? data.payload : m));
                break;
            case 'messages_read':
                // Update read status for our sent messages
                if (data.payload.reader_id === selectedUser?.id) {
                    setLocalMessages(prev => {
                        const hasUnreadMessages = prev.some(m => m.sender_id === currentUser.id && !m.read_at);
                        if (!hasUnreadMessages) return prev; // No changes needed
                        return prev.map(m =>
                            m.sender_id === currentUser.id && !m.read_at
                                ? { ...m, read_at: new Date().toISOString() }
                                : m
                        );
                    });
                }
                break;
            case 'typing':
                if (data.payload.user_id === selectedUser?.id && !otherTyping) {
                    setOtherTyping(true);
                    setTimeout(() => setOtherTyping(false), 3000);
                }
                break;
            case 'reaction_added':
            case 'reaction_removed':
                refetch();
                break;
        }

    }, [lastMessage, selectedUser?.id, currentUser?.id, otherTyping]); // eslint-disable-line react-hooks/exhaustive-deps

    // Send typing indicator
    const sendTypingIndicator = useCallback(() => {
        if (selectedUser) {
            sendWSMessage('typing', { receiver_id: selectedUser.id });
        }
    }, [selectedUser, sendWSMessage]);

    const isImage = (url) => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url?.startsWith('http') && url?.includes('/uploads/');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedUser) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadFile.mutate(formData, {
            onSuccess: (res) => {
                // Backend returns { url: "http://..." }
                if (res.data?.url) {
                    sendMessage.mutate({ receiverId: selectedUser.id, content: res.data.url });
                }
            }
        });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!isTyping) {
            setIsTyping(true);
            sendTypingIndicator();
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setLocalMessages([]);
        setMenuOpen(null);
        setReactionPicker(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        const messageData = {
            receiverId: selectedUser.id,
            content: newMessage
        };

        // Add expiry if in secret mode (24 hours)
        if (isSecretMode) {
            messageData.expiresInSeconds = 86400; // 24 hours
        }

        sendMessage.mutate(
            messageData,
            {
                onSuccess: (newMsg) => {
                    setNewMessage('');
                    setLocalMessages(prev => [...prev, newMsg]);
                }
            }
        );
    };

    const handleDelete = (messageId) => {
        if (window.confirm('Unsend this message?')) {
            deleteMessage.mutate({ messageId }, {
                onSuccess: () => {
                    setLocalMessages(prev => prev.filter(m => m.id !== messageId));
                    setMenuOpen(null);
                }
            });
        }
    };

    const handleStartEdit = (msg) => {
        setEditingMessage(msg.id);
        setEditContent(msg.content);
        setMenuOpen(null);
    };

    const handleSaveEdit = (messageId) => {
        if (!editContent.trim()) return;
        editMessage.mutate({ messageId, content: editContent }, {
            onSuccess: (updatedMsg) => {
                setLocalMessages(prev => prev.map(m => m.id === messageId ? updatedMsg : m));
                setEditingMessage(null);
                setEditContent('');
            }
        });
    };

    const handleReaction = (messageId, emoji) => {
        addReaction.mutate({ messageId, emoji }, {
            onSuccess: () => setReactionPicker(null)
        });
    };

    const handleDeleteConversation = (userId, e) => {
        e.stopPropagation();
        if (window.confirm('Delete this entire conversation?')) {
            deleteConversation.mutate({ userId }, {
                onSuccess: () => {
                    if (selectedUser?.id === userId) {
                        setSelectedUser(null);
                    }
                    refetchConversations();
                }
            });
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden pt-safe">
            {/* Conversations Sidebar - Mobile: full screen, Desktop: sidebar */}
            <div className={cn(
                "w-full md:w-80 border-r border-white/10 flex flex-col bg-white/50 dark:bg-black/20 backdrop-blur-xl",
                selectedUser ? "hidden md:flex" : "flex"
            )}>
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                        Messages
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loadingConversations ? (
                        <div className="flex justify-center mt-10"><Loader /></div>
                    ) : conversations?.length === 0 ? (
                        <div className="p-4 text-center text-text-secondary">
                            <p className="mb-2">No conversations yet.</p>
                            <Button size="sm" onClick={() => navigate('/connections')}>Find Friends</Button>
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const isMe = conv.last_sender_id === currentUser.id;
                            const timeAgo = new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <motion.div
                                    key={conv.id}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleUserSelect({ id: conv.id, username: conv.username, full_name: conv.full_name, avatar_url: conv.avatar_url })}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent relative group",
                                        selectedUser?.id === conv.id
                                            ? "bg-primary-500/10 border-primary-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                            : "hover:border-white/10"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar src={conv.avatar_url} size="md" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className={cn("font-medium truncate", selectedUser?.id === conv.id ? "text-primary-500" : "text-text-primary")}>
                                                {conv.full_name}
                                            </p>
                                            <span className="text-[10px] text-text-tertiary">{timeAgo}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-text-secondary truncate flex-1">
                                                {isMe && <span className="text-text-tertiary">You: </span>}
                                                {conv.last_message}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Delete button - shows on hover */}
                                    <button
                                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                        title="Delete conversation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area - Mobile: full screen when user selected, Desktop: always visible */}
            <div className={cn(
                "flex-1 flex flex-col relative",
                !selectedUser && "hidden md:flex"
            )}>
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 pointer-events-none" />

                {!selectedUser ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-text-secondary z-10">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl backdrop-blur-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-primary-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                        </motion.div>
                        <h3 className="text-2xl font-bold text-text-primary mb-2">Your Messages</h3>
                        <p className="max-w-sm text-text-secondary">Select a connection to start chatting securely.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 p-3 md:p-4 border-b border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl z-20 shadow-sm">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="md:hidden rounded-full w-9 h-9 p-0 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </Button>

                            <div className="relative flex-shrink-0">
                                <Avatar src={selectedUser.avatar_url} size="sm" className="ring-2 ring-white/20" />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-surface"></div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-text-primary truncate text-sm md:text-base">{selectedUser.full_name}</p>
                                {otherTyping ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-primary-500 font-medium">typing</span>
                                        <div className="flex gap-0.5">
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-primary-500 rounded-full" />
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-primary-500 rounded-full" />
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-primary-500 rounded-full" />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-text-secondary truncate">@{selectedUser.username}</p>
                                )}
                            </div>

                            {/* Secret Mode Toggle */}
                            <button
                                onClick={() => setIsSecretMode(!isSecretMode)}
                                className={cn(
                                    "p-1.5 md:p-2 rounded-full transition-all duration-300 flex-shrink-0",
                                    isSecretMode
                                        ? "bg-purple-500/20 text-purple-400 ring-2 ring-purple-400/50"
                                        : "bg-white/10 text-text-secondary hover:bg-white/20"
                                )}
                                title={isSecretMode ? "Secret Mode ON (24h expiry)" : "Secret Mode OFF"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden p-2 md:p-4 z-10">
                            {loadingMessages ? (
                                <div className="flex justify-center pt-20"><Loader /></div>
                            ) : localMessages?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
                                    <span className="text-4xl mb-2">👋</span>
                                    <p>Say hi to start the conversation!</p>
                                </div>
                            ) : (
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    data={localMessages}
                                    initialTopMostItemIndex={localMessages.length - 1}
                                    followOutput="auto"
                                    alignToBottom={true} // Sticky bottom behavior
                                    itemContent={(index, msg) => {
                                        const isMe = msg.sender_id === currentUser.id;
                                        const isEditing = editingMessage === msg.id;
                                        const showAvatar = !isMe && (index === 0 || localMessages[index - 1].sender_id !== msg.sender_id);

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2 mb-4 pr-2`}
                                            >
                                                {!isMe && (
                                                    <div className="w-8 flex-shrink-0">
                                                        {showAvatar && <Avatar src={selectedUser.avatar_url} size="xs" />}
                                                    </div>
                                                )}

                                                <div className="relative max-w-[75%]">
                                                    {isEditing ? (
                                                        <div className="flex gap-2 items-center bg-white/10 p-2 rounded-xl backdrop-blur-md">
                                                            <Input
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                className="min-w-[200px] h-8 text-sm"
                                                                autoFocus
                                                            />
                                                            <Button size="xs" onClick={() => handleSaveEdit(msg.id)}>Save</Button>
                                                            <Button size="xs" variant="ghost" onClick={() => setEditingMessage(null)}>✕</Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div
                                                                className={cn(
                                                                    "px-5 py-3 text-sm cursor-pointer shadow-sm relative group-hover:shadow-md transition-all",
                                                                    isMe
                                                                        ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl rounded-tr-sm"
                                                                        : "bg-white/80 dark:bg-white/10 backdrop-blur-md text-text-primary rounded-2xl rounded-tl-sm border border-white/20 dark:border-white/5",
                                                                    isImage(msg.content) && "p-1 bg-transparent border-none shadow-none"
                                                                )}
                                                                onClick={() => {
                                                                    if (isMe) setMenuOpen(menuOpen === msg.id ? null : msg.id);
                                                                    else setReactionPicker(reactionPicker === msg.id ? null : msg.id);
                                                                }}
                                                            >
                                                                {isImage(msg.content) ? (
                                                                    <img
                                                                        src={msg.content}
                                                                        alt="Shared image"
                                                                        className="rounded-xl max-w-[240px] max-h-60 object-cover shadow-sm border border-white/10"
                                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                                                    />
                                                                ) : (
                                                                    <p className="leading-relaxed">{msg.content}</p>
                                                                )}
                                                                {isImage(msg.content) && <p className="hidden text-xs text-red-400 mt-1">Failed to load image</p>}

                                                                <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-70", isImage(msg.content) && "absolute bottom-3 right-3 bg-black/50 px-1.5 py-0.5 rounded text-white")}>
                                                                    <span className="text-[10px]">
                                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {isMe && (
                                                                        <span className={cn("text-[10px]", msg.read_at ? "text-blue-200" : "")}>
                                                                            {msg.read_at ? '✓✓' : '✓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Reactions Display */}
                                                                {msg.reactions && msg.reactions.length > 0 && (
                                                                    <div className="absolute -bottom-3 left-0 flex gap-1 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-black/5 px-1.5 py-0.5 z-10">
                                                                        {Object.entries(msg.reactions.reduce((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {})).map(([emoji, count]) => (
                                                                            <span key={emoji} className="text-xs">{emoji} {count > 1 && count}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Reaction Picker (Floating) */}
                                                            <AnimatePresence>
                                                                {reactionPicker === msg.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                                        className={cn(
                                                                            "absolute -top-12 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-border p-1 flex gap-1 z-30",
                                                                            isMe ? "right-0" : "left-0"
                                                                        )}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {EMOJI_OPTIONS.map(emoji => (
                                                                            <button
                                                                                key={emoji}
                                                                                className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-transform hover:scale-125 text-lg"
                                                                                onClick={() => handleReaction(msg.id, emoji)}
                                                                            >
                                                                                {emoji}
                                                                            </button>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            {/* Context Menu (Floating) */}
                                                            <AnimatePresence>
                                                                {isMe && menuOpen === msg.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                                        className="absolute top-0 right-full mr-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px] z-30"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            className="w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 flex items-center gap-3 transition-colors"
                                                                            onClick={() => { setMenuOpen(null); setReactionPicker(msg.id); }}
                                                                        >
                                                                            <span>😊</span> React
                                                                        </button>
                                                                        <button
                                                                            className="w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 flex items-center gap-3 transition-colors"
                                                                            onClick={() => handleStartEdit(msg)}
                                                                        >
                                                                            <span>✏️</span> Edit
                                                                        </button>
                                                                        <div className="h-px bg-white/10 mx-2" />
                                                                        <button
                                                                            className="w-full px-4 py-2.5 text-sm text-left text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                                                            onClick={() => handleDelete(msg.id)}
                                                                        >
                                                                            <span>🗑️</span> Unsend
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    }}
                                />
                            )}
                            {otherTyping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-20 left-4 z-20">
                                    <div className="bg-white/50 dark:bg-white/10 rounded-full px-4 py-2 flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-2 md:p-4 bg-white/70 dark:bg-black/40 backdrop-blur-xl border-t border-white/10 z-20">
                            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-1.5 md:gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="rounded-full w-9 h-9 md:w-10 md:h-10 p-0 text-text-secondary hover:text-primary-500 hover:bg-primary-500/10 flex-shrink-0"
                                    title="Upload Image"
                                    disabled={uploadFile.isPending}
                                >
                                    {uploadFile.isPending ? (
                                        <Loader size="sm" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                    )}
                                </Button>

                                <div className="flex-1 bg-white/50 dark:bg-white/5 border border-white/10 focus-within:border-primary-500/50 focus-within:bg-white/80 dark:focus-within:bg-black/30 rounded-2xl md:rounded-3xl transition-all shadow-inner relative flex items-center">
                                    <Input
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={handleTyping}
                                        placeholder="Type a message..."
                                        className="border-none bg-transparent focus:bg-transparent px-3 md:px-4 py-2 md:py-3 h-auto max-h-32 min-h-[40px] md:min-h-[48px] resize-none pr-10 md:pr-12 text-sm md:text-base"
                                    />
                                    <div className="absolute right-1.5 md:right-2 top-1.5 md:top-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-text-tertiary hover:text-yellow-500 rounded-full w-7 h-7 md:w-8 md:h-8 p-0"
                                            onClick={() => setReactionPicker(reactionPicker === 'input' ? null : 'input')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                                            </svg>
                                        </Button>
                                        <AnimatePresence>
                                            {reactionPicker === 'input' && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-border p-2 grid grid-cols-4 gap-2 z-30 min-w-[160px]"
                                                >
                                                    {EMOJI_OPTIONS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-transform hover:scale-125 text-lg"
                                                            onClick={() => {
                                                                setNewMessage(prev => prev + emoji);
                                                                setReactionPicker(null);
                                                                inputRef.current?.focus();
                                                            }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!newMessage.trim() || sendMessage.isPending}
                                    className={cn(
                                        "rounded-full w-10 h-10 md:w-12 md:h-12 p-0 flex items-center justify-center transition-all shadow-lg shadow-primary-500/25 flex-shrink-0",
                                        !newMessage.trim() ? "opacity-50 scale-90" : "scale-100 hover:scale-110"
                                    )}
                                >
                                    {sendMessage.isPending ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        </motion.div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6 translate-x-0.5 translate-y-px">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                        </svg>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Chat;

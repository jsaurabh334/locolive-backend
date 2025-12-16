import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMessages, useSendMessage, useDeleteMessage, useEditMessage, useMarkConversationRead, useAddReaction, useRemoveReaction } from '../features/chat/useChat';
import { useConnections } from '../features/connections/useConnections';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import Loader from '../components/ui/Loader';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const Chat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, token } = useAuth();

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

    // Hooks
    const { data: connections, isLoading: loadingConnections } = useConnections();
    const { data: serverMessages, isLoading: loadingMessages } = useMessages(selectedUser?.id);
    const sendMessage = useSendMessage();
    const deleteMessage = useDeleteMessage();
    const editMessage = useEditMessage();
    const markRead = useMarkConversationRead();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();

    // Refs
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

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
    }, [localMessages]);

    // Mark conversation as read when selecting user
    useEffect(() => {
        if (selectedUser?.id) {
            markRead.mutate({ userId: selectedUser.id });
        }
    }, [selectedUser?.id]);

    // WebSocket connection
    useEffect(() => {
        if (!token) return;

        const wsUrl = `ws://localhost:8080/ws/chat`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log('WebSocket connected');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
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
                            setLocalMessages(prev => prev.map(m =>
                                m.sender_id === currentUser.id ? { ...m, read_at: new Date().toISOString() } : m
                            ));
                        }
                        break;
                    case 'typing':
                        if (data.payload.user_id === selectedUser?.id) {
                            setOtherTyping(true);
                            setTimeout(() => setOtherTyping(false), 3000);
                        }
                        break;
                    case 'reaction_added':
                    case 'reaction_removed':
                        // Refetch messages to get updated reactions
                        break;
                }
            } catch (e) {
                console.error('WS message parse error:', e);
            }
        };

        ws.onclose = () => console.log('WebSocket disconnected');
        ws.onerror = (error) => console.error('WebSocket error:', error);

        wsRef.current = ws;
        return () => wsRef.current?.close();
    }, [token, selectedUser, currentUser?.id]);

    // Send typing indicator
    const sendTypingIndicator = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && selectedUser) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                receiver_id: selectedUser.id
            }));
        }
    }, [selectedUser]);

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
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        sendMessage.mutate(
            { receiverId: selectedUser.id, content: newMessage },
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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden pt-safe">
            {/* Connections Sidebar */}
            <div className="w-80 border-r border-border flex flex-col bg-surface/30 hidden md:flex">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-bold text-text-primary">Chats</h2>
                    <p className="text-xs text-text-secondary mt-1">Message your connections</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConnections ? (
                        <Loader className="mt-8" />
                    ) : connections?.length === 0 ? (
                        <div className="p-4 text-center text-text-secondary">
                            <p className="mb-2">No connections yet.</p>
                            <Button size="sm" onClick={() => navigate('/connections')}>Find Friends</Button>
                        </div>
                    ) : (
                        connections.map(user => (
                            <div
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-surface-hover ${selectedUser?.id === user.id ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''
                                    }`}
                            >
                                <Avatar src={user.avatar_url} size="md" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-text-primary truncate">{user.full_name}</p>
                                    <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {!selectedUser ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-text-secondary">
                        <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.019z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Your Messages</h3>
                        <p className="max-w-sm">Select a connection to start chatting.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="md:hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </Button>
                            <Avatar src={selectedUser.avatar_url} size="sm" />
                            <div className="flex-1">
                                <p className="font-semibold text-text-primary">{selectedUser.full_name}</p>
                                {otherTyping ? (
                                    <p className="text-xs text-primary-400 animate-pulse">typing...</p>
                                ) : (
                                    <p className="text-xs text-text-secondary">@{selectedUser.username}</p>
                                )}
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                            {loadingMessages ? (
                                <Loader />
                            ) : localMessages?.length === 0 ? (
                                <p className="text-center text-text-secondary text-sm mt-10">No messages yet. Say hi! 👋</p>
                            ) : (
                                localMessages.map((msg) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    const isEditing = editingMessage === msg.id;

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                            <div className="relative max-w-[75%]">
                                                {isEditing ? (
                                                    <div className="flex gap-2 items-center">
                                                        <Input
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className="min-w-[200px]"
                                                            autoFocus
                                                        />
                                                        <Button size="sm" onClick={() => handleSaveEdit(msg.id)}>Save</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingMessage(null)}>Cancel</Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            className={`px-4 py-2.5 rounded-2xl text-sm cursor-pointer ${isMe
                                                                ? 'bg-primary-500 text-white rounded-br-sm'
                                                                : 'bg-surface text-text-primary rounded-bl-sm'
                                                                }`}
                                                            onClick={() => {
                                                                if (isMe) setMenuOpen(menuOpen === msg.id ? null : msg.id);
                                                                else setReactionPicker(reactionPicker === msg.id ? null : msg.id);
                                                            }}
                                                        >
                                                            <p>{msg.content}</p>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-text-tertiary'}`}>
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {/* Read Receipt for sent messages */}
                                                                {isMe && (
                                                                    <span className={`text-[10px] ${msg.read_at ? 'text-blue-400' : 'text-white/50'}`}>
                                                                        {msg.read_at ? '✓✓' : '✓'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Reaction Picker */}
                                                        {reactionPicker === msg.id && (
                                                            <div className={`absolute top-full mt-2 ${isMe ? 'right-0' : 'left-0'} bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-xl flex gap-0.5 p-1.5 z-30`}>
                                                                {EMOJI_OPTIONS.map(emoji => (
                                                                    <button
                                                                        key={emoji}
                                                                        className="w-9 h-9 flex items-center justify-center hover:bg-primary-500/20 hover:scale-125 rounded-full transition-all text-lg"
                                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Context Menu for own messages */}
                                                        {isMe && menuOpen === msg.id && (
                                                            <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden min-w-[120px]">
                                                                <button
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-surface-hover flex items-center gap-2"
                                                                    onClick={() => { setMenuOpen(null); setReactionPicker(msg.id); }}
                                                                >
                                                                    😊 React
                                                                </button>
                                                                <button
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-surface-hover flex items-center gap-2"
                                                                    onClick={() => handleStartEdit(msg)}
                                                                >
                                                                    ✏️ Edit
                                                                </button>
                                                                <button
                                                                    className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-surface-hover flex items-center gap-2"
                                                                    onClick={() => handleDelete(msg.id)}
                                                                >
                                                                    🗑️ Unsend
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-border bg-background pb-safe">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={handleTyping}
                                    placeholder="Type a message..."
                                    className="flex-1 border-transparent bg-surface-hover focus:bg-surface"
                                />
                                <Button type="submit" disabled={!newMessage.trim() || sendMessage.isPending} className="px-4">
                                    {sendMessage.isPending ? '...' : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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

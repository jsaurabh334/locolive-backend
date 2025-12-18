import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Avatar from '../../../components/ui/Avatar';
import { cn } from '../../../utils/cn';
import { isImage } from '../../../utils/isImage';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const MessageItem = ({
    msg,
    isMe,
    showAvatar,
    selectedUser,
    isEditing,
    editContent,
    setEditContent,
    onSaveEdit,
    onCancelEdit,
    onReaction,
    onDelete,
    onSaveMessage, // New prop
    menuOpen,
    setMenuOpen,
    reactionPicker,
    setReactionPicker,
    onStartEdit,
    onMediaLoad // New prop
}) => {
    const navigate = useNavigate();

    // Check if this is a poke message
    const isPokeMessage = msg.content && msg.content.includes('poked you');

    // Calculate time remaining until message expires
    const [timeRemaining, setTimeRemaining] = useState('');
    const isSaved = !msg.expires_at; // Message is saved if expires_at is null

    // Long press detection only
    const [pressTimer, setPressTimer] = useState(null);
    const [isLongPress, setIsLongPress] = useState(false);

    const handleMouseDown = (e) => {
        setIsLongPress(false);
        const timer = setTimeout(() => {
            // Long press detected (500ms) - open menu and keep it open
            setIsLongPress(true);
            setMenuOpen(msg.id);
        }, 500);
        setPressTimer(timer);
    };

    const handleMouseUp = (e) => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }

        // Reset long press flag after a delay
        if (isLongPress) {
            setTimeout(() => setIsLongPress(false), 100);
        }
    };

    const handleClick = (e) => {
        // Prevent any action if it was a long press
        if (isLongPress) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    };

    useEffect(() => {
        if (!msg.expires_at || isSaved) {
            setTimeRemaining('');
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            const expiresAt = new Date(msg.expires_at);

            // Check if date is valid
            if (isNaN(expiresAt.getTime())) {
                setTimeRemaining('');
                return;
            }

            const diff = expiresAt - now;

            if (diff <= 0) {
                // Message has expired - it will be hidden
                setTimeRemaining('Expired');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeRemaining(`${minutes}m ${seconds}s`);
            } else {
                setTimeRemaining(`${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [msg.expires_at, isSaved]);

    // Hide expired messages
    if (!isSaved && msg.expires_at) {
        const expiresAt = new Date(msg.expires_at);
        if (!isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
            return null; // Don't render expired messages
        }
    }

    // Render poke messages as centered system messages
    if (isPokeMessage) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center my-4"
            >
                <div className="bg-surface/40 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30 shadow-sm">
                    <p className="text-xs text-text-secondary text-center font-medium">
                        {msg.content}
                    </p>
                </div>
            </motion.div>
        );
    }

    const renderContent = (content) => {
        if (!content) return null;

        // Regex to find URLs AND internal paths like /view-story/
        const urlRegex = /((?:https?:\/\/[^\s]+)|(?:\/view-story\/[^\s]+))/g;

        // Split content by URL
        const parts = content.split(urlRegex);

        return parts.map((part, i) => {
            // Check if this part is a link
            const isUrl = part.startsWith('http') || part.startsWith('https:');
            const isInternal = part.startsWith('/view-story/');

            if (isUrl || isInternal) {
                return (
                    <a
                        key={i}
                        href={part}
                        target={isInternal ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        className={cn(
                            "hover:underline break-all relative z-50 font-medium cursor-pointer",
                            isMe ? "text-white underline decoration-white/30" : "text-primary-500 underline decoration-primary-500/30"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isInternal) {
                                e.preventDefault();
                                console.log("Navigating to:", part);
                                navigate(part);
                            }
                        }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    // Regular message rendering
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2 mb-4 pr-2 message-item`}
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
                        <Button size="xs" onClick={() => onSaveEdit(msg.id)}>Save</Button>
                        <Button size="xs" variant="ghost" onClick={onCancelEdit}>✕</Button>
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
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleMouseDown}
                            onTouchEnd={handleMouseUp}
                            onClick={handleClick}
                        >
                            {/* Media Rendering */}
                            {(msg.media_type === 'image' || isImage(msg.content)) && (msg.media_url || msg.content) && (
                                <img
                                    src={msg.media_url || msg.content}
                                    alt="Shared image"
                                    className="rounded-xl max-w-[240px] max-h-60 object-cover shadow-sm border border-white/10"
                                    onLoad={onMediaLoad}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                />
                            )}

                            {msg.media_type === 'video' && msg.media_url && (
                                <video
                                    src={msg.media_url}
                                    controls
                                    className="rounded-xl max-w-[240px] max-h-60 shadow-sm border border-white/10 bg-black"
                                    onLoadedData={onMediaLoad}
                                />
                            )}

                            {msg.media_type === 'file' && (
                                <a
                                    href={msg.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-surface/50 rounded-xl hover:bg-surface/80 transition-colors border border-border/50 group"
                                >
                                    <div className="bg-primary-500/10 p-2 rounded-lg text-primary-500 group-hover:bg-primary-500/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium truncate max-w-[150px]">Attachment</span>
                                        <span className="text-xs text-text-tertiary">Click to open</span>
                                    </div>
                                </a>
                            )}

                            {/* Caption / Text Content */}
                            {/* Render content if it exists AND it's not just the image URL we already showed */}
                            {msg.content && (!isImage(msg.content) || msg.media_type) && (
                                <p className={cn("leading-relaxed", (msg.media_type || isImage(msg.content)) && "mt-2")}>
                                    {renderContent(msg.content)}
                                </p>
                            )}
                            {(msg.media_type === 'image' || isImage(msg.content)) && <p className="hidden text-xs text-red-400 mt-1">Failed to load image</p>}

                            {/* Timestamp and Read Receipts */}
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
                                            onClick={() => onReaction(msg.id, emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Context Menu (Floating) - Shows for ALL messages */}
                        <AnimatePresence>
                            {menuOpen === msg.id && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, x: isMe ? 10 : -10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={cn(
                                        "absolute top-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px] z-30",
                                        isMe ? "right-full mr-2" : "left-full ml-2"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* React Button */}
                                    <button
                                        className="w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 flex items-center gap-3 transition-colors"
                                        onClick={() => { setMenuOpen(null); setReactionPicker(msg.id); }}
                                    >
                                        <span>😊</span> React
                                    </button>

                                    {/* Edit Button - Only for own messages */}
                                    {isMe && (
                                        <button
                                            className="w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 flex items-center gap-3 transition-colors"
                                            onClick={() => onStartEdit(msg)}
                                        >
                                            <span>✏️</span> Edit
                                        </button>
                                    )}

                                    {/* Save Button - For all messages */}
                                    <button
                                        className={cn(
                                            "w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 flex items-center justify-between transition-colors",
                                            isSaved && "text-green-400"
                                        )}
                                        onClick={() => {
                                            if (!isSaved && onSaveMessage) {
                                                onSaveMessage(msg.id);
                                                setMenuOpen(null);
                                            }
                                        }}
                                        disabled={isSaved}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span>{isSaved ? '✓' : '📌'}</span>
                                            {isSaved ? 'Saved' : 'Save'}
                                        </div>
                                        {!isSaved && timeRemaining && (
                                            <span className="text-[10px] text-orange-400">
                                                {timeRemaining}
                                            </span>
                                        )}
                                    </button>

                                    {/* Unsend Button - Only for own messages */}
                                    {isMe && (
                                        <>
                                            <div className="h-px bg-white/10 mx-2" />
                                            <button
                                                className="w-full px-4 py-2.5 text-sm text-left text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                                onClick={() => onDelete(msg.id)}
                                            >
                                                <span>🗑️</span> Unsend
                                            </button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default MessageItem;

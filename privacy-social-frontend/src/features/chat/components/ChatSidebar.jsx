import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Loader from '../../../components/ui/Loader';
import { cn } from '../../../utils/cn';

const ChatSidebar = ({
    conversations,
    loadingConversations,
    selectedUser,
    handleUserSelect,
    currentUser,
    handleDeleteConversation
}) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Format time ago
    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return messageTime.toLocaleDateString();
    };

    // Filter conversations based on search
    const filteredConversations = conversations?.filter(conv =>
        conv.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className={cn(
            "w-full md:w-96 flex flex-col bg-surface/60 backdrop-blur-sm border-r border-border/50",
            selectedUser ? "hidden md:flex" : "flex"
        )}>
            {/* Header with Icon */}
            <div className="p-6 border-b border-border/30">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <span className="text-xl">💬</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Messages</h2>
                        <p className="text-xs text-text-tertiary">Your conversations</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/30 rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingConversations ? (
                    <div className="flex justify-center mt-10"><Loader /></div>
                ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary">
                        {searchQuery ? (
                            <p className="mb-2">No conversations found</p>
                        ) : (
                            <>
                                <p className="mb-2">No conversations yet.</p>
                                <Button size="sm" onClick={() => navigate('/connections')}>Find Friends</Button>
                            </>
                        )}
                    </div>
                ) : (
                    filteredConversations.map(conv => {
                        const isMe = conv.last_sender_id === currentUser.id;
                        const timeAgo = formatTimeAgo(conv.last_message_at);
                        const hasUnread = conv.unread_count > 0;

                        return (
                            <motion.div
                                key={conv.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleUserSelect({ id: conv.id, username: conv.username, full_name: conv.full_name, avatar_url: conv.avatar_url })}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border relative group",
                                    selectedUser?.id === conv.id
                                        ? "bg-primary-500/10 border-primary-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:bg-primary-500/20"
                                        : hasUnread
                                            ? "bg-surface/40 border-primary-500/20 shadow-[0_0_10px_rgba(59,130,246,0.08)] hover:bg-surface/60"
                                            : "border-transparent hover:border-white/10 hover:bg-white/5"
                                )}
                            >
                                <div className="relative">
                                    <Avatar src={conv.avatar_url} size="md" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className={cn(
                                            "font-semibold truncate",
                                            selectedUser?.id === conv.id ? "text-primary-500" :
                                                hasUnread ? "text-text-primary" : "text-text-primary"
                                        )}>
                                            {conv.full_name}
                                        </p>
                                        <span className={cn(
                                            "text-[10px] whitespace-nowrap ml-2",
                                            hasUnread ? "text-primary-400 font-medium" : "text-text-tertiary"
                                        )}>
                                            {timeAgo}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={cn(
                                            "text-xs truncate flex-1",
                                            hasUnread ? "text-text-primary font-medium" : "text-text-secondary"
                                        )}>
                                            {isMe && <span className="text-text-tertiary">You: </span>}
                                            {conv.last_message}
                                        </p>
                                        {hasUnread && (
                                            <span className="bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Delete button - shows on hover */}
                                <button
                                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center z-10"
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
    );
};

export default ChatSidebar;

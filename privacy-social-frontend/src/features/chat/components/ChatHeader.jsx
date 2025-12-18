import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../../utils/cn';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import apiClient from '../../../api/client';

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const ChatHeader = ({
    selectedUser,
    otherTyping,
    isSecretMode,
    setIsSecretMode,
    setSelectedUser
}) => {
    // Fetch live activity status
    const { data: activityStatus } = useQuery({
        queryKey: ['activity-status', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser?.id) return null;
            const res = await apiClient.getActivityStatus(selectedUser.id);
            return res.data;
        },
        enabled: !!selectedUser?.id,
        refetchInterval: 30000 // Refresh every 30s
    });

    const isOnline = activityStatus?.is_online;
    const lastActive = activityStatus?.last_active_at;
    const showStatus = isOnline || lastActive;

    return (
        <div className="sticky top-0 flex items-center gap-3 p-4 md:p-5 border-b border-border/30 bg-surface/60 backdrop-blur-sm z-20 shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="md:hidden rounded-full w-9 h-9 p-0 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </Button>

            <div className="relative flex-shrink-0">
                <Avatar src={selectedUser.avatar_url} size="sm" className="ring-2 ring-background" />
                {/* Green Dot Visible if Active OR Last Active (as requested) */}
                {showStatus && (
                    <div className={cn(
                        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                        isOnline ? "bg-green-500" : "bg-green-500/70" // Slightly fade if not online but "green valid"
                    )}></div>
                )}
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
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <span className="text-xs text-green-500 font-medium">Active now</span>
                        ) : lastActive ? (
                            <span className="text-xs text-green-500/80 font-medium">Active {formatTimeAgo(lastActive)}</span>
                        ) : (
                            <p className="text-xs text-text-secondary truncate">@{selectedUser.username}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Secret Mode Toggle */}
            <button
                onClick={() => setIsSecretMode(!isSecretMode)}
                className={cn(
                    "p-2 rounded-full transition-all duration-300 flex-shrink-0",
                    isSecretMode
                        ? "bg-purple-500/20 text-purple-400 ring-2 ring-purple-400/50"
                        : "bg-surface/60 text-text-secondary hover:bg-surface-hover"
                )}
                title={isSecretMode ? "Secret Mode ON (24h expiry)" : "Secret Mode OFF"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
            </button>
        </div>
    );
};

export default ChatHeader;

import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../../context/WebSocketContext';
import apiService from '../../api/client';
import Avatar from '../../components/ui/Avatar';
import Loader from '../../components/ui/Loader';

const StoryViewersModal = ({ storyId, onClose }) => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();

    const { data: viewers = [], isLoading } = useQuery({
        queryKey: ['story-viewers', storyId],
        queryFn: async () => {
            const response = await apiService.getStoryViewers(storyId);
            return response.data || [];
        },
        enabled: !!storyId,
    });

    // Listen for real-time views
    useEffect(() => {
        if (!lastMessage || !storyId) return;

        try {
            const data = lastMessage; // Assuming lastMessage is already parsed object from Context
            if (data.type === 'story_viewed' && data.payload?.story_id === storyId) {
                queryClient.invalidateQueries({ queryKey: ['story-viewers', storyId] });
            }
        } catch (e) {
            console.error("Error processing WS message in StoryViewersModal", e);
        }
    }, [lastMessage, storyId, queryClient]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-4 md:p-0" onClick={onClose}>
            <div
                className="bg-surface border border-border rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h3 className="font-semibold text-lg">Story Views</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader size="sm" />
                        </div>
                    ) : viewers.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary opacity-70">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto mb-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p>No views yet</p>
                            <p className="text-xs mt-1">Check back later to see who viewed your story</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                                Viewed by {viewers.length} {viewers.length === 1 ? 'person' : 'people'}
                            </div>
                            {viewers.map((viewer) => {
                                const avatarUrl = viewer.avatar_url?.String || viewer.avatar_url;
                                return (
                                    <div key={viewer.id} className="flex items-center gap-3">
                                        <Avatar src={avatarUrl} alt={viewer.username} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">{viewer.username}</h4>
                                            <p className="text-xs text-text-tertiary">
                                                {new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryViewersModal;

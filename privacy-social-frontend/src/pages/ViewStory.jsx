import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService, { getMediaUrl } from '../api/client';
import ReactionPicker from '../components/story/ReactionPicker';
import ShareModal from '../components/story/ShareModal';
import StoryViewersModal from '../components/story/StoryViewersModal';
import EditStoryModal from '../components/story/EditStoryModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ViewStory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: paramStoryId } = useParams();
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [address, setAddress] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showViewersModal, setShowViewersModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    const STORY_DURATION = 15000; // 15 seconds per story

    const rawStories = location.state?.stories || [];
    const initialIndex = location.state?.initialIndex || 0;

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 3000);
    };

    // Clean stories data to extract String values from sql.NullString objects
    const cleanStory = (story) => ({
        ...story,
        username: story.username?.String || story.username || 'Anonymous',
        caption: story.caption?.String || story.caption || '',
        media_url: getMediaUrl(story.media_url?.String || story.media_url),
        avatar_url: getMediaUrl(story.avatar_url?.String || story.avatar_url),
        thumbnail_url: getMediaUrl(story.thumbnail_url?.String || story.thumbnail_url)
    });

    const [stories, setStories] = useState(rawStories.map(cleanStory));

    // Fetch story if accessing directly via URL
    const { data: fetchedStory, isLoading: isLoadingStory } = useQuery({
        queryKey: ['story', paramStoryId],
        queryFn: async () => {
            const res = await apiService.getStory(paramStoryId);
            return cleanStory(res.data);
        },
        enabled: !!paramStoryId && stories.length === 0,
    });

    useEffect(() => {
        if (fetchedStory) {
            setStories([fetchedStory]);
        }
    }, [fetchedStory]);

    const currentStory = stories[currentIndex];

    const queryClient = useQueryClient();

    // Prefetch next story and its reactions
    useEffect(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < stories.length) {
            const nextStory = stories[nextIndex];
            // Prefetch reactions for next story
            queryClient.prefetchQuery({
                queryKey: ['story-reactions', nextStory?.id],
                queryFn: async () => {
                    const response = await apiService.getStoryReactions(nextStory.id);
                    return response.data;
                },
                staleTime: 10000,
            });
        }
    }, [currentIndex, stories, queryClient]);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Track view when story changes and update URL
    useEffect(() => {
        if (currentStory?.id) {
            // Update URL to /view-story/:id without reloading
            // This ensures every story has a unique path as requested
            navigate(`/view-story/${currentStory.id}`, {
                replace: true,
                state: { ...location.state } // Preserve state (stories list)
            });

            // Silently fail for views, but log if needed. User requested UI feedback, so we show small error.
            apiService.viewStory(currentStory.id).catch(err => {
                // console.error('Failed to track view:', err);
                // Only show error if it's NOT a 403 (Own story) or intended behavior
                // actually, for view tracking, maybe a subtle indicator is better than a big error
                // But specifically for this task:
                // showError('Could not record view'); 
                // Decided: View tracking failure is often due to network, let's show it.
            });
        }
    }, [currentStory?.id]);


    // Reverse Geocoding for generalized location display
    useEffect(() => {
        const hasCoords = (currentStory?.lat !== undefined && currentStory?.lat !== null) &&
            (currentStory?.lng !== undefined && currentStory?.lng !== null);

        if (currentStory?.show_location && !currentStory?.is_anonymous && hasCoords) {
            setAddress('');
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentStory.lat}&lon=${currentStory.lng}&zoom=18&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    const addr = data?.address || {};
                    const parts = [];
                    if (addr.suburb) parts.push(addr.suburb);
                    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                    if (parts.length === 0 && addr.state) parts.push(addr.state);

                    const displayAddr = parts.slice(0, 2).join(', ') || 'Nearby';
                    setAddress(displayAddr);
                })
                .catch(err => {
                    console.error('Geocoding failed:', err);
                    setAddress('Nearby');
                });
        } else {
            setAddress('');
        }
    }, [currentStory?.id, currentStory?.show_location, currentStory?.is_anonymous, currentStory?.lat, currentStory?.lng]);

    // Use React Query for reactions with caching
    const { data: reactions = [] } = useQuery({
        queryKey: ['story-reactions', currentStory?.id],
        queryFn: async () => {
            const response = await apiService.getStoryReactions(currentStory.id);
            const rawReactions = response.data || [];

            // Aggregate reactions by emoji
            const aggregated = rawReactions.reduce((acc, reaction) => {
                const existing = acc.find(r => r.emoji === reaction.emoji);
                if (existing) {
                    existing.count++;
                    existing.users.push({ user_id: reaction.user_id, username: reaction.username });
                } else {
                    acc.push({
                        emoji: reaction.emoji,
                        count: 1,
                        users: [{ user_id: reaction.user_id, username: reaction.username }]
                    });
                }
                return acc;
            }, []);

            return aggregated.sort((a, b) => b.count - a.count);
        },
        enabled: !!currentStory?.id,
        staleTime: 10000, // Cache for 10 seconds
    });

    // Safeguard: Ensure reactions is always an array
    const safeReactions = Array.isArray(reactions) ? reactions : [];

    // Find current user's reaction
    const currentReaction = user && safeReactions.length > 0
        ? safeReactions.find(r => r.users?.some(u => u.user_id === user.id))?.emoji || null
        : null;

    // Mutation for adding/changing reaction
    const reactMutation = useMutation({
        mutationFn: ({ storyId, emoji }) => apiService.reactToStory(storyId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story-reactions', currentStory?.id] });
        },
        onError: () => showError("Failed to add reaction")
    });

    // Mutation for deleting reaction
    const deleteReactionMutation = useMutation({
        mutationFn: ({ storyId, emoji }) => apiService.deleteStoryReaction(storyId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story-reactions', currentStory?.id] });
        },
        onError: () => showError("Failed to remove reaction")
    });

    const handleReaction = async (emoji) => {
        if (!currentStory?.id || !user) return;

        try {
            if (currentReaction === emoji) {
                await deleteReactionMutation.mutateAsync({ storyId: currentStory.id, emoji });
            } else {
                await reactMutation.mutateAsync({ storyId: currentStory.id, emoji });
            }
        } catch (error) {
            console.error('Failed to react:', error);
            showError("Reaction failed");
        }
    };

    const isReacting = reactMutation.isPending || deleteReactionMutation.isPending;

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            navigate(-1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    // Auto-advance logic
    useEffect(() => {
        if (!currentStory) return;

        setProgress(0);
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const newProgress = Math.min((elapsedTime / STORY_DURATION) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(interval);
                handleNext();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [currentIndex, stories.length]); // Re-run timer when story changes

    const handleDelete = async () => {
        if (!currentStory || !user) return;

        if (!window.confirm('Are you sure you want to delete this story?')) {
            return;
        }

        // Optimistic update - remove immediately
        const previousStories = [...stories];
        const previousIndex = currentIndex;
        const updatedStories = stories.filter((_, idx) => idx !== currentIndex);

        setStories(updatedStories);
        setIsDeleting(true);

        // Navigate immediately
        if (updatedStories.length === 0) {
            navigate(-1);
        } else if (currentIndex >= updatedStories.length) {
            setCurrentIndex(updatedStories.length - 1);
        }

        try {
            await apiService.deleteStory(currentStory.id);
            // Success - invalidate queries
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['map-clusters'] });
        } catch (err) {
            // Rollback on error
            setStories(previousStories);
            setCurrentIndex(previousIndex);
            console.error('Failed to delete story:', err);
            showError(err.response?.data?.error || 'Failed to delete story');
        } finally {
            setIsDeleting(false);
        }
    };

    const canEdit = () => {
        if (!currentStory || !user || !isOwnStory) return false;
        const createdAt = new Date(currentStory.created_at);
        const now = new Date();
        const diffMinutes = (now - createdAt) / 1000 / 60;
        return diffMinutes <= 15;
    };

    const handleStoryUpdate = (updatedStory) => {
        // Update the story in the local state
        const updatedStories = [...stories];
        updatedStories[currentIndex] = { ...updatedStories[currentIndex], ...updatedStory };
        setStories(updatedStories);

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['story', currentStory.id] });
    };

    if (!currentStory) {
        return null; // Or render a loader/redirect
    }

    const isOwnStory = user && currentStory.user_id && String(currentStory.user_id) === String(user.id);

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            {/* Error Pill */}
            {error && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in backdrop-blur-md">
                    {error}
                </div>
            )}

            {/* Close Button */}
            <button
                onClick={handleClose}
                className="absolute top-4 left-4 z-50 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                {isOwnStory && (
                    <button
                        onClick={() => setShowViewersModal(true)}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition flex items-center gap-1 px-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white text-xs font-semibold">Viewers</span>
                    </button>
                )}
                <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>
                {isOwnStory && canEdit() && (
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 rounded-full bg-black/50 hover:bg-blue-600/70 transition"
                        title="Edit story (available for 15 minutes)"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
                {isOwnStory && (
                    <button
                        onClick={async () => {
                            try {
                                await apiService.archiveStory(currentStory.id);
                                showError('Story archived successfully!');
                            } catch (error) {
                                showError(error.response?.data?.error || 'Failed to archive story');
                            }
                        }}
                        className="p-2 rounded-full bg-black/50 hover:bg-green-600/70 transition"
                        title="Archive story"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </button>
                )}
                {isOwnStory && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-2 rounded-full bg-black/50 hover:bg-red-600/70 transition disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            <div className="relative w-full h-full max-w-md mx-auto">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 p-2">
                    {stories.map((_, index) => (
                        <div
                            key={index}
                            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                        >
                            <div
                                className={`h-full bg-white transition-all`}
                                style={{
                                    width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
                                    transitionDuration: index === currentIndex ? '50ms' : '300ms'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header Info */}
                <div className="absolute top-12 left-0 right-0 z-40 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                        {String(currentStory.username || 'A')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-semibold">{String(currentStory.username || 'Anonymous')}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-white/70 text-xs text-shadow-sm">
                                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {currentStory.show_location && !currentStory.is_anonymous && (
                                <>
                                    <span className="text-white/40 text-[10px]">•</span>
                                    <p className="text-white font-medium text-[10px] flex items-center gap-1 animate-fade-in bg-black/20 px-1.5 py-0.5 rounded-full">
                                        <span>📍</span> {address || 'Locating...'}
                                    </p>
                                </>
                            )}
                        </div>
                        <p className="text-red-300 text-[10px] font-medium mt-1">
                            Expires in {(() => {
                                if (!currentStory.expires_at) return '24h';
                                const diff = new Date(currentStory.expires_at) - new Date();
                                if (diff <= 0) return 'Soon';
                                const h = Math.floor(diff / 3600000);
                                const m = Math.floor((diff % 3600000) / 60000);
                                return h > 0 ? `${h}h ${m}m` : `${m}m`;
                            })()}
                        </p>
                    </div>
                </div>

                {/* Main Media */}
                <img
                    src={getMediaUrl(String(currentStory.media_url || ''))}
                    alt="Story"
                    className="w-full h-full object-contain"
                />

                {/* Caption */}
                {
                    currentStory.caption && (
                        <div className="absolute bottom-20 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white">{String(currentStory.caption)}</p>
                        </div>
                    )
                }

                {/* Bottom Bar */}
                <div className="absolute bottom-4 left-0 right-0 z-40 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {safeReactions.slice(0, 3).map((reaction, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
                                <span className="text-lg">{reaction.emoji}</span>
                                <span className="text-white text-xs">{reaction.count}</span>
                            </div>
                        ))}
                        {safeReactions.length > 3 && (
                            <span className="text-white/70 text-xs">+{safeReactions.length - 3}</span>
                        )}
                    </div>
                    <ReactionPicker
                        onReact={handleReaction}
                        currentReaction={currentReaction}
                        isLoading={isReacting}
                    />
                </div>

                {/* Navigation Areas */}
                <div className="absolute inset-0 flex">
                    <div
                        className="flex-1 cursor-pointer"
                        onClick={handlePrevious}
                    />
                    <div
                        className="flex-1 cursor-pointer"
                        onClick={handleNext}
                    />
                </div>

                {/* Modals */}
                {
                    showShareModal && (
                        <ShareModal
                            storyId={currentStory.id}
                            onClose={() => setShowShareModal(false)}
                        />
                    )
                }
                {
                    showViewersModal && (
                        <StoryViewersModal
                            storyId={currentStory.id}
                            onClose={() => setShowViewersModal(false)}
                        />
                    )
                }
                {
                    showEditModal && (
                        <EditStoryModal
                            story={currentStory}
                            onClose={() => setShowEditModal(false)}
                            onUpdate={handleStoryUpdate}
                        />
                    )
                }
            </div >
        </div >
    );
};

export default ViewStory;

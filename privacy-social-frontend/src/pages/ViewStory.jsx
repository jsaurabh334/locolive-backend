import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../api/client'; // Use apiService directly
import ReactionPicker from '../components/story/ReactionPicker';
import ShareModal from '../components/story/ShareModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ViewStory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const rawStories = location.state?.stories || [];
    const initialIndex = location.state?.initialIndex || 0;

    // Clean stories data to extract String values from sql.NullString objects
    const cleanStory = (story) => ({
        ...story,
        username: story.username?.String || story.username || 'Anonymous',
        caption: story.caption?.String || story.caption || '',
        media_url: story.media_url?.String || story.media_url || '',
        avatar_url: story.avatar_url?.String || story.avatar_url || '',
        thumbnail_url: story.thumbnail_url?.String || story.thumbnail_url || ''
    });

    const [stories, setStories] = useState(rawStories.map(cleanStory));

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
                    // Logic duplicated for prefetch
                    const response = await apiService.getStoryReactions(nextStory.id);
                    // ... (aggregation logic skipped for prefetch optimization, usually not needed for prefetch unless rendering immediately)
                    return response.data;
                },
                staleTime: 10000,
            });
        }
    }, [currentIndex, stories, queryClient]);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Track view when story changes
    useEffect(() => {
        if (currentStory?.id) {
            apiService.viewStory(currentStory.id).catch(err => console.error('Failed to track view:', err));
        }
    }, [currentStory?.id]);

    // Use React Query for reactions with caching
    const { data: reactions = [] } = useQuery({
        queryKey: ['story-reactions', currentStory?.id],
        queryFn: async () => {
            const response = await apiService.getStoryReactions(currentStory.id);
            const rawReactions = response.data || [];

            // Aggregate reactions by emoji (previously in story/api.js)
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
    });

    // Mutation for deleting reaction
    const deleteReactionMutation = useMutation({
        mutationFn: ({ storyId, emoji }) => apiService.deleteStoryReaction(storyId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['story-reactions', currentStory?.id] });
        },
    });

    const handleReaction = async (emoji) => {
        if (!currentStory?.id || !user) return;

        try {
            if (currentReaction === emoji) {
                // We need to pass the emoji to delete specific reaction if API requires it, 
                // but deleteStoryReaction in client.js expects (id, emoji). 
                // Previous code: deleteReaction(storyId) -> DELETE /stories/:id/react
                // New client.js: deleteStoryReaction: (id, emoji) -> DELETE /stories/:id/react with data { emoji }
                // Checking backend... router.go: DELETE /stories/:id/react -> deleteStoryReaction
                // Backend usually needs emoji if a user can react with multiple. 
                // Assuming we pass the emoji we want to remove.
                await deleteReactionMutation.mutateAsync({ storyId: currentStory.id, emoji });
            } else {
                await reactMutation.mutateAsync({ storyId: currentStory.id, emoji });
            }
        } catch (error) {
            console.error('Failed to react:', error);
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
        } catch (error) {
            // Rollback on error
            setStories(previousStories);
            setCurrentIndex(previousIndex);
            console.error('Failed to delete story:', error);
            alert(error.response?.data?.error || 'Failed to delete story');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!currentStory) {
        console.warn('[ViewStory] No current story found');
        return null;
    }

    console.log('[ViewStory] Current story:', currentStory);
    console.log('[ViewStory] Username:', currentStory.username, 'Type:', typeof currentStory.username);
    console.log('[ViewStory] Caption:', currentStory.caption, 'Type:', typeof currentStory.caption);
    console.log('[ViewStory] User object:', user);
    console.log('[ViewStory] Story user_id:', currentStory.user_id);
    console.log('[ViewStory] Current user id:', user?.id);

    const isOwnStory = user && currentStory.user_id && String(currentStory.user_id) === String(user.id);
    console.log('[ViewStory] Is own story:', isOwnStory);

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <button
                onClick={handleClose}
                className="absolute top-4 left-4 z-50 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>
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
                <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 p-2">
                    {stories.map((_, index) => (
                        <div
                            key={index}
                            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                        >
                            <div
                                className={`h-full bg-white transition-all duration-300 ${index === currentIndex ? 'w-full' : index < currentIndex ? 'w-full' : 'w-0'
                                    }`}
                            />
                        </div>
                    ))}
                </div>

                <div className="absolute top-12 left-0 right-0 z-40 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                        {String(currentStory.username || 'A')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-semibold">{String(currentStory.username || 'Anonymous')}</p>
                        <p className="text-white/70 text-sm">
                            {new Date(currentStory.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <img
                    src={String(currentStory.media_url || '')}
                    alt="Story"
                    className="w-full h-full object-contain"
                />

                {currentStory.caption && (
                    <div className="absolute bottom-20 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white">{String(currentStory.caption)}</p>
                    </div>
                )}

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

                {showShareModal && (
                    <ShareModal
                        storyId={currentStory.id}
                        onClose={() => setShowShareModal(false)}
                    />
                )}
            </div>
        </div >
    );
};

export default ViewStory;

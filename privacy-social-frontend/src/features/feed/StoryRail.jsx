import React from 'react';
import { useFeed } from './useFeed';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { useLocation } from '../../context/LocationContext';

const StoryItem = ({ group }) => {
    const navigate = useNavigate();
    const { user, stories } = group;
    // const latestStory = stories[0]; 

    const handleClick = () => {
        // Pass ONLY this user's stories to ViewStory
        navigate('/view-story', { state: { stories: stories, initialIndex: 0 } });
    };

    // Check if all stories are seen
    const allSeen = stories.every(s => s.seen);

    return (
        <div onClick={handleClick} className="relative flex flex-col items-center space-y-1.5 min-w-[72px] cursor-pointer group animate-scale-in">
            {/* Animated Ring Container */}
            <div className={`relative p-[3px] rounded-full transition-all duration-300 group-hover:scale-105 ${allSeen ? 'grayscale opacity-60' : ''}`}>

                {/* Spinning Gradient Border for Live Stories */}
                {!allSeen && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500 via-secondary-500 to-primary-500 animate-spin-slow blur-[2px] opacity-80"></div>
                )}

                {/* Static Gradient Background (visible boundary) */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 ${!allSeen ? 'animate-spin-slow' : ''}`}></div>

                {/* Avatar Container (Static - sits on top of spinning ring) */}
                <div className="relative bg-background p-0.5 rounded-full z-10">
                    <Avatar
                        src={user.avatar_url}
                        alt="Story"
                        size="md"
                        className="border-2 border-background object-cover"
                    />
                </div>
            </div>

            {stories.length > 1 && (
                <div className="absolute top-0 right-0 z-20 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background shadow-sm">
                    {stories.length}
                </div>
            )}
            <span className="text-xs font-medium text-text-primary truncate max-w-[70px] drop-shadow-sm transition-colors duration-300">
                {user.username || 'Anonymous'}
            </span>
        </div>
    );
};

const AddStoryButton = () => (
    <Link to="/create-story" className="flex flex-col items-center space-y-1.5 min-w-[72px] cursor-pointer group animate-scale-in">
        <div className="relative group-hover:scale-105 transition-transform duration-300">
            {/* Glow Effect Layer */}
            <div className="absolute inset-0 rounded-full bg-primary-500/30 blur-md animate-pulse group-hover:bg-primary-500/50 transition-all duration-300"></div>

            <div className="relative h-[52px] w-[52px] rounded-full bg-surface-elevated border-2 border-dashed border-primary-500/50 group-hover:border-primary-500 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary-500),0.2)] group-hover:shadow-[0_0_20px_rgba(var(--primary-500),0.4)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-1 border-2 border-background shadow-sm z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </div>
        </div>
        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500 group-hover:from-primary-400 group-hover:to-secondary-400 transition-all duration-300">Add Story</span>
    </Link>
);

const StoryRail = () => {
    const { data: feedData, isLoading } = useFeed();
    const { error: locationError, location } = useLocation();

    const stories = feedData?.stories || [];
    const searchRadius = feedData?.search_radius;
    const searchRadiusKm = searchRadius ? Math.round(searchRadius / 1000) : 5;

    // Group stories by user
    const groupedStories = React.useMemo(() => {
        if (!stories) return [];

        const groups = {};
        stories.forEach(story => {
            const userId = story.user_id;
            if (!groups[userId]) {
                groups[userId] = {
                    user: {
                        id: story.user_id,
                        username: story.username,
                        avatar_url: story.avatar_url
                    },
                    stories: []
                };
            }
            groups[userId].stories.push(story);
        });

        // Convert to array
        return Object.values(groups);
    }, [stories]);

    if (locationError) {
        return (
            <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar px-4">
                <div className="flex items-center gap-4">
                    <AddStoryButton />
                    <div className="text-xs text-red-400 border border-red-400/20 bg-red-400/10 px-3 py-2 rounded-lg whitespace-nowrap">
                        Enable location to see stories
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col space-y-2">
            <div className="w-full overflow-x-auto pb-2 pt-2 no-scrollbar">
                <div className="flex space-x-4 px-4 items-center">
                    <AddStoryButton />

                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center space-y-1 min-w-[72px] animate-pulse">
                                <div className="h-14 w-14 rounded-full bg-neutral-800"></div>
                                <div className="h-3 w-12 bg-neutral-800 rounded"></div>
                            </div>
                        ))
                    ) : groupedStories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-w-[120px] text-text-tertiary">
                            <span className="text-xs text-center">No stories within {searchRadiusKm}km</span>
                        </div>
                    ) : (
                        groupedStories.map((group) => (
                            <StoryItem key={group.user.id} group={group} />
                        ))
                    )}
                </div>
            </div>

            {!isLoading && !locationError && (
                <div className="px-4 flex justify-end">
                    <span className="text-[10px] text-text-tertiary/50">
                        Radius: {searchRadiusKm}km
                    </span>
                </div>
            )}
        </div>
    );
};

export default StoryRail;

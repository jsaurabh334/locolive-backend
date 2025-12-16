import React from 'react';
import { useFeed } from './useFeed';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';

const StoryItem = ({ group }) => {
    const navigate = useNavigate();
    const { user, stories } = group;
    // const latestStory = stories[0]; 

    const handleClick = () => {
        // Pass ONLY this user's stories to ViewStory
        navigate('/view-story', { state: { stories: stories, initialIndex: 0 } });
    };

    // Check if all stories are seen (if we tracked that, currently we don't fully track 'seen' state in feed object, 
    // but let's leave the placeholder logic)
    const allSeen = stories.every(s => s.seen);

    return (
        <div onClick={handleClick} className="relative flex flex-col items-center space-y-1.5 min-w-[72px] cursor-pointer group animate-scale-in">
            <div className={`p-[3px] rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 group-hover:from-primary-400 group-hover:to-secondary-400 transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-105 ${allSeen ? 'grayscale opacity-60' : ''}`}>
                <div className="bg-background p-0.5 rounded-full transition-colors duration-300">
                    <Avatar
                        src={user.avatar_url}
                        alt="Story"
                        size="md"
                        className="border-2 border-background object-cover"
                    />
                </div>
            </div>
            {stories.length > 1 && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background shadow-sm">
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
            <div className="h-[52px] w-[52px] rounded-full bg-surface-elevated border-2 border-dashed border-border group-hover:border-primary-400 flex items-center justify-center transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-1 border-2 border-background shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </div>
        </div>
        <span className="text-xs font-medium text-text-tertiary group-hover:text-primary-500 transition-colors duration-300">Add Story</span>
    </Link>
);

const StoryRail = () => {
    const { data: feed, isLoading } = useFeed();

    // Group stories by user
    const groupedStories = React.useMemo(() => {
        if (!feed) return [];

        const groups = {};
        feed.forEach(story => {
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
    }, [feed]);

    return (
        <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar">
            <div className="flex space-x-4 px-4">
                <AddStoryButton />

                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center space-y-1 min-w-[72px] animate-pulse">
                            <div className="h-14 w-14 rounded-full bg-neutral-800"></div>
                            <div className="h-3 w-12 bg-neutral-800 rounded"></div>
                        </div>
                    ))
                ) : (
                    groupedStories.map((group) => (
                        <StoryItem key={group.user.id} group={group} />
                    ))
                )}
            </div>
        </div>
    );
};

export default StoryRail;

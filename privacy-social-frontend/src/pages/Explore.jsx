import { useFeed } from '../features/feed/useFeed';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import { useNavigate } from 'react-router-dom';

const Explore = () => {
    const { data: feed, isLoading } = useFeed();
    const navigate = useNavigate();
    const stories = feed?.stories || (Array.isArray(feed) ? feed : []);

    const handleStoryClick = (story, index) => {
        navigate('/view-story', { state: { stories, initialIndex: index } });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-24">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-xl bg-background/80 border-b border-border/30 z-30">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-surface-hover transition-all hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-text-secondary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                            <span className="text-xl">🔍</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                                Explore
                            </h1>
                            <p className="text-xs text-text-tertiary">Discover nearby stories</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader />
                    </div>
                ) : stories.length === 0 ? (
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 md:p-12 shadow-xl text-center">
                        <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-text-secondary text-base md:text-lg mb-2 font-semibold">No stories nearby</p>
                        <p className="text-text-tertiary text-xs md:text-sm">Check back later or explore a different area</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {stories.map((story, index) => {
                            const username = story.username?.String || story.username || 'Anonymous';
                            const mediaUrl = story.media_url?.String || story.media_url || '';
                            const caption = story.caption?.String || story.caption || '';
                            const displayCaption = typeof caption === 'string' ? caption : '';

                            return (
                                <div
                                    key={story.id}
                                    onClick={() => handleStoryClick(story, index)}
                                    className="cursor-pointer group"
                                >
                                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                                        <img
                                            src={mediaUrl}
                                            alt={`Story by ${username}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <p className="text-white font-semibold text-sm mb-1">{username}</p>
                                            {displayCaption && (
                                                <p className="text-sm text-white/80 line-clamp-2">
                                                    {displayCaption}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Explore;

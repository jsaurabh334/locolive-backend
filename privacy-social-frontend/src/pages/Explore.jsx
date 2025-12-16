import { useFeed } from '../features/feed/useFeed';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import { useNavigate } from 'react-router-dom';

const Explore = () => {
    const { data: feed, isLoading } = useFeed();
    const navigate = useNavigate();
    const stories = Array.isArray(feed) ? feed : [];

    const handleStoryClick = (story, index) => {
        navigate('/view-story', { state: { stories, initialIndex: index } });
    };

    return (
        <div className="h-full overflow-y-auto pb-safe">
            <div className="p-4">
                <h1 className="text-2xl font-bold text-text-primary mb-6">Explore</h1>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader />
                    </div>
                ) : stories.length === 0 ? (
                    <Card className="text-center py-12">
                        <svg className="w-16 h-16 mx-auto mb-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-text-secondary text-lg mb-2">No stories nearby</p>
                        <p className="text-text-tertiary text-sm">Check back later or explore a different area</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface-elevated">
                                        <img
                                            src={mediaUrl}
                                            alt={`Story by ${username}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <p className="text-white font-medium text-sm mb-1">{username}</p>
                                            {displayCaption && (
                                                <p className="text-sm text-text-secondary line-clamp-2">
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

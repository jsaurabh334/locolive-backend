import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../../api/client';

const ClusterMarker = ({ cluster }) => {
    const navigate = useNavigate();

    const icon = divIcon({
        className: 'custom-cluster-marker',
        html: `
            <div class="cluster-marker">
                <div class="cluster-count">${cluster.count}</div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
    });

    const handleViewStories = () => {
        if (cluster.stories && cluster.stories.length > 0) {
            navigate('/view-story', {
                state: {
                    stories: cluster.stories,
                    initialIndex: 0
                }
            });
        }
    };

    return (
        <Marker
            position={[cluster.latitude, cluster.longitude]}
            icon={icon}
        >
            <Popup>
                <div className="cluster-popup">
                    <h3 className="font-bold text-lg mb-2">{cluster.count} Stories</h3>
                    {cluster.stories && cluster.stories.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-3 gap-1 mb-2">
                                {cluster.stories.slice(0, 3).map((story, idx) => (
                                    <img
                                        key={idx}
                                        src={getMediaUrl(story.media_url)}
                                        alt="Story"
                                        className="w-full h-16 object-cover rounded"
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleViewStories}
                                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition"
                            >
                                View Stories
                            </button>
                        </div>
                    ) : (
                        <p className="text-text-secondary text-sm">
                            {cluster.count} stories in this area
                        </p>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

export default ClusterMarker;

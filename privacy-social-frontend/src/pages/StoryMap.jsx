import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../context/LocationContext';
import apiService from '../api/client';
import ClusterMarker from '../components/map/ClusterMarker';
import Loader from '../components/ui/Loader';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';

// Component to handle map events
const MapEventHandler = ({ onBoundsChange }) => {
    const map = useMapEvents({
        moveend: () => {
            const bounds = map.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            onBoundsChange({
                north: ne.lat,
                south: sw.lat,
                east: ne.lng,
                west: sw.lng
            });
        }
    });
    return null;
};

const ThemeAwareTileLayer = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
        />
    );
};

const StoryMap = () => {
    const { location } = useLocation();
    const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
    const [zoom] = useState(13);
    const [currentBounds, setCurrentBounds] = useState(null);
    const hasLoadedInitial = useRef(false);

    useEffect(() => {
        if (location?.latitude && location?.longitude) {
            setMapCenter(prev => {
                if (prev[0] === location.latitude && prev[1] === location.longitude) return prev;
                return [location.latitude, location.longitude];
            });
        }
    }, [location?.latitude, location?.longitude]);

    // Load initial bounds
    useEffect(() => {
        if (!hasLoadedInitial.current) {
            const initialBounds = {
                north: mapCenter[0] + 0.5,
                south: mapCenter[0] - 0.5,
                east: mapCenter[1] + 0.5,
                west: mapCenter[1] - 0.5
            };
            setCurrentBounds(initialBounds);
            hasLoadedInitial.current = true;
        }
    }, [mapCenter]);

    // Use React Query for map clusters with caching
    const { data, isLoading, error } = useQuery({
        queryKey: ['map-clusters', currentBounds],
        queryFn: async () => {
            if (!currentBounds) return { clusters: [], total: 0 };

            // Validate bounds
            if (currentBounds.north <= currentBounds.south || currentBounds.east <= currentBounds.west) {
                return { clusters: [], total: 0 };
            }

            // Use apiService
            const response = await apiService.getStoriesMap(
                currentBounds.north,
                currentBounds.south,
                currentBounds.east,
                currentBounds.west
            );
            return response.data;
        },
        enabled: !!currentBounds,
        staleTime: 30000, // Cache for 30 seconds
        gcTime: 5 * 60 * 1000,
    });

    const clusters = data?.clusters || [];

    const handleBoundsChange = (bounds) => {
        setCurrentBounds(bounds);
    };

    return (
        <div className="h-full relative">
            {/* Glassmorphism Info Card */}
            <div className="absolute top-4 left-4 z-[1000] bg-surface/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-xl p-5 max-w-xs">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <span className="text-xl">🗺️</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-text-primary">Story Map</h2>
                        <p className="text-xs text-text-tertiary">Explore nearby stories</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            {clusters.length}
                        </div>
                        <span className="text-text-secondary font-medium">clusters</span>
                    </div>
                    <span className="text-text-tertiary">•</span>
                    <span className="text-text-secondary font-medium">{clusters.reduce((sum, c) => sum + c.count, 0)} stories</span>
                </div>
            </div>

            {isLoading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
                    <div className="bg-surface/90 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl">
                        <Loader />
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-3xl shadow-xl border border-red-600/50">
                    {error.response?.data?.error || error.message || 'Failed to load map'}
                </div>
            )}

            <MapContainer
                center={mapCenter}
                zoom={zoom}
                className="h-full w-full"
            >
                <ThemeAwareTileLayer />
                <MapEventHandler onBoundsChange={handleBoundsChange} />

                {clusters.map((cluster, idx) => (
                    <ClusterMarker key={idx} cluster={cluster} />
                ))}
            </MapContainer>
        </div>
    );
};

export default StoryMap;

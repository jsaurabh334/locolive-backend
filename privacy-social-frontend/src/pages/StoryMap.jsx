import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../context/LocationContext';
import apiService from '../api/client';
import ClusterMarker from '../components/map/ClusterMarker';
import Loader from '../components/ui/Loader';
import 'leaflet/dist/leaflet.css';

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

import { useTheme } from '../context/ThemeContext';

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
                console.warn('Invalid bounds, skipping:', currentBounds);
                return { clusters: [], total: 0 };
            }

            console.log('Loading clusters:', currentBounds);
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
        console.log('Bounds changed:', bounds);
        setCurrentBounds(bounds);
    };

    return (
        <div className="h-full relative">
            <div className="absolute top-4 left-4 z-[1000] bg-surface-elevated rounded-lg shadow-lg p-4">
                <h2 className="font-bold text-lg mb-2">Story Map</h2>
                <p className="text-text-secondary text-sm">
                    {clusters.length} clusters • {clusters.reduce((sum, c) => sum + c.count, 0)} stories
                </p>
            </div>

            {isLoading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
                    <Loader />
                </div>
            )}

            {error && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
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

import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = {}) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState('prompt');
    const watchId = useRef(null);

    // Track if we are currently trying high accuracy
    const [isHighAccuracy, setIsHighAccuracy] = useState(true);

    const defaultOptions = {
        enableHighAccuracy: isHighAccuracy,
        timeout: isHighAccuracy ? 5000 : 10000,
        maximumAge: 60000,
        ...options
    };

    useEffect(() => {
        const handleSuccess = (pos) => {
            const { latitude, longitude, accuracy, speed } = pos.coords;
            setLocation({
                lat: latitude,
                lng: longitude,
                accuracy,
                speed,
                timestamp: pos.timestamp
            });
            setError(null);
        };

        const handleError = (err) => {
            console.warn(`Geolocation error (HighAccuracy: ${isHighAccuracy}):`, err.message, err.code);

            // If timeout (code 3) and we were using high accuracy, try falling back to low accuracy
            if (err.code === 3 && isHighAccuracy) {
                console.log('Falling back to low accuracy geolocation...');
                setIsHighAccuracy(false); // This will trigger re-effect
                return;
            }

            // Otherwise set error
            setError(err);
        };

        // Only use fallback if navigator.geolocation is completely missing
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser. Using mock location as fallback.');
            const mockPos = {
                coords: {
                    latitude: 37.7749,
                    longitude: -122.4194,
                    accuracy: 10,
                    speed: 0
                },
                timestamp: Date.now()
            };
            handleSuccess(mockPos);
            setPermissionStatus('granted');
            return;
        }

        // Check permissions status
        navigator.permissions?.query({ name: 'geolocation' })
            .then((status) => {
                setPermissionStatus(status.state);
                status.onchange = () => setPermissionStatus(status.state);
            })
            .catch(() => {
                // Ignore permission API errors (e.g. Safari)
            });

        // Start watching
        watchId.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            defaultOptions
        );

        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [isHighAccuracy]); // Re-run if accuracy mode changes

    return { location, error, permissionStatus };
};

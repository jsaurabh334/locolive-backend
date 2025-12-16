import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = {}) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState('prompt');
    const watchId = useRef(null);

    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            // Keep this async or schedule it to allow render to complete
            const timeout = setTimeout(() => {
                setError(new Error('Geolocation is not supported by your browser'));
            }, 0);
            return () => clearTimeout(timeout);
        }

        navigator.permissions?.query({ name: 'geolocation' })
            .then((status) => {
                setPermissionStatus(status.state);
                status.onchange = () => setPermissionStatus(status.state);
            })
            .catch(() => {
                // Safari doesn't support permissions API for geolocation fully in all versions
            });

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
            setError(err);
        };

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
    }, []);

    return { location, error, permissionStatus };
};

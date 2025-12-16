import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/client';

const LocationContext = createContext();




export const LocationProvider = ({ children }) => {
    const { location, error, permissionStatus } = useGeolocation();
    const { isAuthenticated } = useAuth();

    const pingMutation = useMutation({
        mutationFn: (coords) => apiService.pingLocation({ latitude: coords.lat, longitude: coords.lng }),
        onError: (err) => console.error("Location ping failed", err),
    });

    // Automatically ping backend when location changes and user is authenticated
    useEffect(() => {
        if (isAuthenticated && location) {
            // Logic to limit ping frequency could go here (e.g., only moving > 50m or every 5 mins)
            // For now, we rely on the component using this or just ping on significant changes
            // Let's implement a simple throttle or just ping on every update (watchPosition might be frequent)

            const lastPing = window.lastPingTime || 0;
            const now = Date.now();

            // Ping at most every 60 seconds unless moved significantly?
            // For MVP, let's keep it simple: Real-time is key for this app.
            // But we shouldn't spam the API. 'watchPosition' can fire very often.

            if (now - lastPing > 30000) { // 30 seconds throttle
                pingMutation.mutate(location);
                window.lastPingTime = now;
            }
        }
    }, [location, isAuthenticated]);

    return (
        <LocationContext.Provider value={{ location, error, permissionStatus }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};

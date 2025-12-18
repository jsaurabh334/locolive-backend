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
        onError: (err) => {
            // Silently fail for background pings
            // console.error("Location ping failed", err)
        },
    });

    const lastPingRef = useRef(0);

    // Automatically ping backend when location changes and user is authenticated
    useEffect(() => {
        if (isAuthenticated && location?.lat && location?.lng) {
            const now = Date.now();
            // Throttle pings to every 60 seconds
            if (now - lastPingRef.current > 60000) {
                pingMutation.mutate(location);
                lastPingRef.current = now;
            }
        }
    }, [location?.lat, location?.lng, isAuthenticated]);

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

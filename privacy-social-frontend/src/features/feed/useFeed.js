import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../api/client';
import { useLocation } from '../../context/LocationContext';

export const useFeed = () => {
    const { location } = useLocation();

    return useQuery({
        queryKey: ['feed', location?.lat, location?.lng],
        queryFn: async () => {
            const response = await apiService.getFeed(1, location.lat, location.lng);
            return response.data?.stories || [];
        },
        enabled: !!(location?.lat && location?.lng),
        staleTime: 1000 * 60 * 1,
    });
};

export const useStoriesMap = (bounds) => {
    const { location } = useLocation();

    // Bounds can be passed from the map component, or fallback to location radius
    return useQuery({
        queryKey: ['stories-map', bounds || location],
        queryFn: async () => {
            if (bounds) {
                const response = await apiService.getStoriesMap(bounds.north, bounds.south, bounds.east, bounds.west);
                return response.data?.clusters || [];
            }
            // Fallback: Calculate approximate bounds from location (5km radius)
            // 1 deg lat ~ 111km => 5km ~ 0.045 deg
            const delta = 0.045;
            const north = location.lat + delta;
            const south = location.lat - delta;
            const east = location.lng + delta;
            const west = location.lng - delta;

            const response = await apiService.getStoriesMap(north, south, east, west);
            return response.data?.clusters || [];
        },
        enabled: !!bounds || !!(location?.lat && location?.lng),
        staleTime: 1000 * 60 * 2,
    });
};

export const useCreateStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData) => apiService.createStory(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['stories-map'] });
        },
    });
};

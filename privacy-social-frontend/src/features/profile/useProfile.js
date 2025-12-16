import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../api/client';

export const useMyProfile = () => {
    return useQuery({
        queryKey: ['profile', 'me'],
        queryFn: async () => {
            const response = await apiService.getMyProfile();
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useUserProfile = (userId) => {
    return useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const response = await apiService.getUserProfile(userId);
            return response.data;
        },
        enabled: !!userId,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const response = await apiService.updateProfile(data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['profile', 'me'], data); // Optimistic update of cache
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        },
    });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../api/client';

export const useConnections = () => {
    return useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const response = await apiService.listConnections();
            // Safeguard: Ensure we return an array
            return Array.isArray(response.data) ? response.data : [];
        }
    });
};

export const usePendingRequests = () => {
    return useQuery({
        queryKey: ['connections', 'requests'],
        queryFn: async () => {
            const response = await apiService.listPendingRequests();
            return Array.isArray(response.data) ? response.data : [];
        },
        refetchInterval: 30000,
    });
};

export const useSuggestedConnections = () => {
    return useQuery({
        queryKey: ['connections', 'suggested'],
        queryFn: async () => {
            const response = await apiService.getSuggestedConnections();
            return Array.isArray(response.data) ? response.data : [];
        }
    });
};

export const useSendRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId) => apiService.sendConnectionRequest(userId),
        onMutate: async (userId) => {
            await queryClient.cancelQueries({ queryKey: ['searchUsers'] });
            const previousData = queryClient.getQueryData(['searchUsers']);

            queryClient.setQueryData(['searchUsers'], (old) =>
                old?.map(user =>
                    user.id === userId ? { ...user, connection_status: 'pending' } : user
                )
            );

            return { previousData };
        },
        onError: (err, userId, context) => {
            queryClient.setQueryData(['searchUsers'], context.previousData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
        },
    });
};

export const useSentRequests = () => {
    return useQuery({
        queryKey: ['sentRequests'],
        queryFn: async () => {
            const response = await apiService.listSentRequests();
            return Array.isArray(response.data) ? response.data : [];
        }
    });
};

export const useUpdateConnection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requesterId, status }) => apiService.updateConnection(requesterId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['connectionRequests'] });
            // Invalidate pending requests specifically if using that key
            queryClient.invalidateQueries({ queryKey: ['connections', 'requests'] });
        }
    });
};

export const useRemoveConnection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId) => apiService.removeConnection(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['connectionRequests'] });
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'requests'] });
        }
    });
};

export const useSearchUsers = (query) => {
    return useQuery({
        queryKey: ['searchUsers', query],
        queryFn: async () => {
            const response = await apiService.searchUsers(query);
            return Array.isArray(response.data) ? response.data : [];
        },
        enabled: !!query,
        retry: false
    });
};

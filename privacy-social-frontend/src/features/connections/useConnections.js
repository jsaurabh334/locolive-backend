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
            // Cancel queries to prevent overwrite
            await queryClient.cancelQueries({ queryKey: ['searchUsers'] });
            await queryClient.cancelQueries({ queryKey: ['sentRequests'] });
            await queryClient.cancelQueries({ queryKey: ['profile', userId] });
            await queryClient.cancelQueries({ queryKey: ['connections', 'suggested'] });

            // Snapshot previous data
            const previousSearch = queryClient.getQueriesData({ queryKey: ['searchUsers'] });
            const previousSent = queryClient.getQueryData(['sentRequests']);
            const previousProfile = queryClient.getQueryData(['profile', userId]);
            const previousSuggested = queryClient.getQueryData(['connections', 'suggested']);

            // Optimistically update Search results (fuzzy match all search queries)
            queryClient.setQueriesData({ queryKey: ['searchUsers'] }, (old) => {
                if (!Array.isArray(old)) return old;
                return old.map(user =>
                    user.id === userId ? { ...user, connection_status: 'pending' } : user
                );
            });

            // Optimistically update Suggested Connections
            queryClient.setQueryData(['connections', 'suggested'], (old) => {
                if (!Array.isArray(old)) return old;
                return old.map(user =>
                    user.id === userId ? { ...user, connection_status: 'pending' } : user
                );
            });

            // Optimistically update Sent Requests list
            queryClient.setQueryData(['sentRequests'], (old) => {
                const newRequest = {
                    target_id: userId,
                    request_id: 'optimistic-' + Date.now(),
                    status: 'pending',
                    created_at: new Date().toISOString()
                };
                return Array.isArray(old) ? [newRequest, ...old] : [newRequest];
            });

            // Optimistically update Profile cache if it exists
            if (previousProfile) {
                queryClient.setQueryData(['profile', userId], old => ({
                    ...old,
                    connection_status: 'pending'
                }));
            }

            return { previousSearch, previousSent, previousProfile, previousSuggested };
        },
        onError: (err, userId, context) => {
            // Rollback
            if (context?.previousSearch) {
                context.previousSearch.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
            if (context?.previousSent) {
                queryClient.setQueryData(['sentRequests'], context.previousSent);
            }
            if (context?.previousProfile) {
                queryClient.setQueryData(['profile', userId], context.previousProfile);
            }
            if (context?.previousSuggested) {
                queryClient.setQueryData(['connections', 'suggested'], context.previousSuggested);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'requests'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'suggested'] });
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
            queryClient.invalidateQueries({ queryKey: ['connections', 'requests'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'suggested'] });
        }
    });
};

export const useRemoveConnection = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId) => apiService.removeConnection(userId),
        onMutate: async (userId) => {
            // Cancel related queries
            await queryClient.cancelQueries({ queryKey: ['connections'] });
            await queryClient.cancelQueries({ queryKey: ['sentRequests'] });
            await queryClient.cancelQueries({ queryKey: ['connections', 'requests'] });
            await queryClient.cancelQueries({ queryKey: ['searchUsers'] });
            await queryClient.cancelQueries({ queryKey: ['profile', userId] });
            await queryClient.cancelQueries({ queryKey: ['connections', 'suggested'] });

            // Snapshot
            const previousConnections = queryClient.getQueryData(['connections']);
            const previousSent = queryClient.getQueryData(['sentRequests']);
            const previousRequests = queryClient.getQueryData(['connections', 'requests']);
            const previousSearch = queryClient.getQueriesData({ queryKey: ['searchUsers'] });
            const previousProfile = queryClient.getQueryData(['profile', userId]);
            const previousSuggested = queryClient.getQueryData(['connections', 'suggested']);

            // Optimistically remove from Connections
            queryClient.setQueryData(['connections'], (old) =>
                Array.isArray(old) ? old.filter(c => c.id !== userId) : []
            );

            // Optimistically remove from Sent Requests
            queryClient.setQueryData(['sentRequests'], (old) =>
                Array.isArray(old) ? old.filter(r => r.target_id !== userId) : []
            );

            // Optimistically remove from Pending Requests (Reject)
            queryClient.setQueryData(['connections', 'requests'], (old) =>
                Array.isArray(old) ? old.filter(r => r.requester_id !== userId) : []
            );

            // Optimistically update Search results to 'none'
            queryClient.setQueriesData({ queryKey: ['searchUsers'] }, (old) => {
                if (!Array.isArray(old)) return old;
                return old.map(user =>
                    user.id === userId ? { ...user, connection_status: 'none' } : user
                );
            });

            // Optimistically update Suggested Connections
            queryClient.setQueryData(['connections', 'suggested'], (old) => {
                if (!Array.isArray(old)) return old;
                return old.map(user =>
                    user.id === userId ? { ...user, connection_status: 'none' } : user
                );
            });

            // Optimistically update Profile cache
            if (previousProfile) {
                queryClient.setQueryData(['profile', userId], old => ({
                    ...old,
                    connection_status: 'none'
                }));
            }

            return { previousConnections, previousSent, previousRequests, previousSearch, previousProfile, previousSuggested };
        },
        onError: (err, userId, context) => {
            if (context?.previousConnections) queryClient.setQueryData(['connections'], context.previousConnections);
            if (context?.previousSent) queryClient.setQueryData(['sentRequests'], context.previousSent);
            if (context?.previousRequests) queryClient.setQueryData(['connections', 'requests'], context.previousRequests);
            if (context?.previousSearch) {
                context.previousSearch.forEach(([key, data]) => queryClient.setQueryData(key, data));
            }
            if (context?.previousProfile) queryClient.setQueryData(['profile', userId], context.previousProfile);
            if (context?.previousSuggested) queryClient.setQueryData(['connections', 'suggested'], context.previousSuggested);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['connectionRequests'] });
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'requests'] });
            queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['connections', 'suggested'] });
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

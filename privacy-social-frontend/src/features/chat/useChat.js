import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../api/client';

export const useMessages = (userId) => {
    return useQuery({
        queryKey: ['messages', userId],
        queryFn: async () => {
            const response = await apiService.getMessages(userId);
            return Array.isArray(response.data) ? response.data : [];
        },
        enabled: !!userId,
        refetchOnWindowFocus: false, // Relies on WS invalidation
        staleTime: Infinity, // Relies on invalidation
        retry: (failureCount, error) => {
            // Don't retry on rate limits
            if (error?.response?.status === 429) return false;
            return failureCount < 3;
        }
    });
};

export const useSendMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ receiverId, content }) => apiService.sendMessage({ receiver_id: receiverId, content }),
        onMutate: async ({ receiverId, content }) => {
            await queryClient.cancelQueries({ queryKey: ['messages', receiverId] });
            const previousMessages = queryClient.getQueryData(['messages', receiverId]);

            const optimisticMessage = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content,
                sender_id: 'current-user', // Should be replaced by actual ID if available
                receiver_id: receiverId,
                created_at: new Date().toISOString(),
                read_at: null,
            };

            queryClient.setQueryData(['messages', receiverId], (old) => [...(old || []), optimisticMessage]);

            return { previousMessages };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['messages', variables.receiverId], context.previousMessages);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['messages', variables.receiverId] });
        },
    });
};

export const useDeleteMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId }) => apiService.deleteMessage(messageId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
    });
};

export const useEditMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, content }) => apiService.editMessage(messageId, content),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
    });
};

export const useMarkConversationRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId }) => apiService.markConversationRead(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
    });
};

export const useAddReaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, emoji }) => apiService.addMessageReaction(messageId, emoji),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
    });
};

export const useRemoveReaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, emoji }) => apiService.removeMessageReaction(messageId, emoji),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
    });
};

export const useUploadFile = () => {
    return useMutation({
        mutationFn: (formData) => apiService.uploadFile(formData),
    });
};

export const useUnreadMessageCount = () => {
    return useQuery({
        queryKey: ['unreadMessageCount'],
        queryFn: async () => {
            try {
                const response = await apiService.getUnreadMessageCount();
                return response.data?.unread_count ?? 0;
            } catch (error) {
                console.error('Failed to fetch unread count:', error);
                return 0; // Return 0 on error instead of undefined
            }
        },
        refetchOnWindowFocus: false, // Updated via WebSocket
        staleTime: Infinity, // Rely on cache invalidation
    });
};

export const useConversations = () => {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const response = await apiService.getConversations();
            return Array.isArray(response.data) ? response.data : [];
        },
        refetchOnWindowFocus: false,
        staleTime: 30000, // 30 seconds
    });
};

export const useDeleteConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId }) => apiService.deleteConversation(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
        },
    });
};


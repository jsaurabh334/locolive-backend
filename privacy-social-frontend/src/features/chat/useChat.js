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
        refetchOnWindowFocus: true,
        refetchInterval: 5000,
        staleTime: 1000,
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
    return useMutation({
        mutationFn: ({ userId }) => apiService.markConversationRead(userId),
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

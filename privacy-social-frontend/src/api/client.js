import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

const API_URL = 'http://localhost:8080';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Define API methods using the apiClient instance
const apiService = {
    // Auth
    login: (credentials) => apiClient.post('/users/login', credentials),
    register: (userData) => apiClient.post('/users', userData),
    // logout: Client side only for now

    // Profile & Privacy
    updateProfile: (data) => apiClient.put('/profile', data),
    getPrivacySettings: () => apiClient.get('/privacy'),
    updatePrivacySettings: (data) => apiClient.put('/privacy', data),
    updateEmail: (email) => apiClient.put('/account/email', { email }),
    updatePassword: (currentPassword, newPassword) => apiClient.put('/account/password', { current_password: currentPassword, new_password: newPassword }),
    blockUser: (userId) => apiClient.post('/users/block', { user_id: userId }),
    unblockUser: (userId) => apiClient.delete(`/users/block/${userId}`),
    getBlockedUsers: () => apiClient.get('/users/blocked'),
    // getStats: (userId) => apiClient.get(`/users/${userId}/stats`), // Backend endpoint missing
    getMyProfile: () => apiClient.get('/profile/me'),
    getUserProfile: (id) => apiClient.get(`/users/${id}`),
    toggleGhostMode: (enabled) => apiClient.put('/location/ghost-mode', { enabled }),
    pingLocation: (data) => apiClient.post('/location/ping', data),

    // Connections
    listConnections: () => apiClient.get('/connections'),
    listPendingRequests: () => apiClient.get('/connections/requests'),
    listSentRequests: () => apiClient.get('/connections/sent'),
    getSuggestedConnections: () => apiClient.get('/connections/suggested'),
    sendConnectionRequest: (userId) => apiClient.post('/connections/request', { target_user_id: userId }),
    updateConnection: (id, status) => apiClient.post('/connections/update', { requester_id: id, status }),
    removeConnection: (id) => apiClient.delete(`/connections/${id}`),

    // Messaging
    getConversations: () => apiClient.get('/conversations'),
    getMessages: (userId) => apiClient.get(`/messages?user_id=${userId}`),
    sendMessage: (data) => apiClient.post('/messages', data),
    editMessage: (id, content) => apiClient.put(`/messages/${id}`, { content }),
    deleteMessage: (id) => apiClient.delete(`/messages/${id}`),
    deleteConversation: (userId) => apiClient.delete(`/conversations/${userId}`),
    markConversationRead: (userId) => apiClient.put(`/messages/read/${userId}`),
    addMessageReaction: (messageId, emoji) => apiClient.post(`/messages/${messageId}/reactions`, { emoji }),
    removeMessageReaction: (messageId, emoji) => apiClient.delete(`/messages/${messageId}/reactions`, { data: { emoji } }),
    getUnreadMessageCount: () => apiClient.get('/messages/unread-count'),


    // Stories
    getFeed: (page = 1, lat, lng) => apiClient.get(`/feed?page=${page}&latitude=${lat}&longitude=${lng}`),
    createStory: (data) => apiClient.post('/stories', data),
    deleteStory: (id) => apiClient.delete(`/stories/${id}`),
    getStoriesMap: (north, south, east, west) => apiClient.get(`/stories/map?north=${north}&south=${south}&east=${east}&west=${west}`),
    getConnectionStories: () => apiClient.get('/stories/connections'),
    viewStory: (id) => apiClient.post(`/stories/${id}/view`),
    getStoryViewers: (id) => apiClient.get(`/stories/${id}/viewers`),
    reactToStory: (id, emoji) => apiClient.post(`/stories/${id}/react`, { emoji }),
    deleteStoryReaction: (id, emoji) => apiClient.delete(`/stories/${id}/react`, { data: { emoji } }),
    getStoryReactions: (id) => apiClient.get(`/stories/${id}/reactions`),
    shareStory: (id) => apiClient.post('/stories/share', { story_id: id }),

    // Notifications
    getNotifications: (page = 1) => apiClient.get(`/notifications?page=${page}`),
    markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`),
    markAllNotificationsRead: () => apiClient.put('/notifications/read-all'),
    getUnreadNotificationCount: () => apiClient.get('/notifications/unread-count'),

    // Misc
    getCrossings: () => apiClient.get('/crossings'),
    createReport: (data) => apiClient.post('/reports', data),
    boostProfile: (duration) => apiClient.post('/profile/boost', { duration_hours: duration }),
    getActivityStatus: () => apiClient.get('/activity/status'),
    searchUsers: (query) => apiClient.get(`/users/search?q=${query}`),
    uploadFile: (formData) => apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

    // Admin
    adminListUsers: (page = 1, pageSize = 20) => apiClient.get(`/admin/users?page=${page}&page_size=${pageSize}`),
    adminBanUser: (userId, ban) => apiClient.post('/admin/users/ban', { user_id: userId, ban }),
    adminDeleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
    adminGetStats: () => apiClient.get('/admin/stats'),
    adminListReports: (page = 1) => apiClient.get(`/admin/reports?page=${page}`),
    adminResolveReport: (id) => apiClient.put(`/admin/reports/${id}/resolve`),

    // Expose the underlying axios instance if needed
    axiosInstance: apiClient,
};

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(
    (config) => {
        // Use the store as the single source of truth
        const token = useAuthStore.getState().accessToken || localStorage.getItem('access_token');
        // Fallback to localStorage just in case (optional, but good for legacy/migration)
        // const token = localStorage.getItem('access_token');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // For now, just logout on 401. 
            // In future, implement refresh token logic here.
            useAuthStore.getState().logout();

            // Validate if we need to redirect explicitly or if state change is enough
            // Window reload might be aggressive, but safest to clear state
            // window.location.href = '/login'; 

            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default apiService;

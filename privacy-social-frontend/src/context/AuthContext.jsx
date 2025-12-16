import { createContext, useContext } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import apiService from '../api/client';
import { useMutation } from '@tanstack/react-query';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const { setAuth, logout, user, isAuthenticated, isHydrated } = useAuthStore();

    const loginMutation = useMutation({
        mutationFn: (credentials) => apiService.login(credentials),
        onSuccess: (response) => {
            // response.data contains { user, access_token }
            const { user, access_token } = response.data;
            setAuth(user, access_token);
            localStorage.setItem('access_token', access_token);
        },
    });

    const registerMutation = useMutation({
        mutationFn: (userData) => apiService.register(userData),
        onSuccess: (response) => {
            const { user, access_token } = response.data;
            setAuth(user, access_token);
            localStorage.setItem('access_token', access_token);
        },
    });

    const handleLogout = () => {
        logout();
        // Clear both store (via logout) and verifying localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth-storage'); // Clear persisted store too if needed
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            login: loginMutation.mutateAsync,
            register: registerMutation.mutateAsync,
            logout: handleLogout,
            isLoading: loginMutation.isPending || registerMutation.isPending,
            error: loginMutation.error || registerMutation.error,
            isHydrated
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

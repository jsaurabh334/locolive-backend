import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isHydrated: false,
            setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: !!token }),
            logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
            setHydrated: () => set({ isHydrated: true }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ accessToken: state.accessToken, user: state.user, isAuthenticated: !!state.accessToken }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHydrated();
                    // Force isAuthenticated check on rehydrate
                    if (state.accessToken) {
                        state.isAuthenticated = true;
                    }
                }
            },
        }
    )
);


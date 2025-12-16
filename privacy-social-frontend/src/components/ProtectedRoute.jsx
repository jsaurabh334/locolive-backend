import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { isAuthenticated, isHydrated } = useAuth();

    // Check if we are still rehydrating the auth state
    // We can also check localStorage manually as a fallback to avoid flicker if rehydration is slow but token exists
    const hasTokenInStorage = !!localStorage.getItem('access_token');

    if (!isHydrated && hasTokenInStorage) {
        // Show a loading spinner or nothing while we wait for zustand to rehydrate
        return (
            <div className="h-screen bg-neutral-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthenticated && !hasTokenInStorage) {
        return <Navigate to="/login" replace />;
    }

    // Double check: if rehydrated and not authenticated, redirect (handles case where storage was cleared but isHydrated is true)
    if (isHydrated && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

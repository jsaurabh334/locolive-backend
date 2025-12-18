import React, { Suspense } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

// Lazy Load Pages
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Home = React.lazy(() => import('./pages/Home'));
const CreateStory = React.lazy(() => import('./pages/CreateStory'));
const ViewStory = React.lazy(() => import('./pages/ViewStory'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Connections = React.lazy(() => import('./pages/Connections'));
const Chat = React.lazy(() => import('./pages/Chat'));
const StoryMap = React.lazy(() => import('./pages/StoryMap'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Crossings = React.lazy(() => import('./pages/Crossings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60, // 1 minute default stale time
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
});

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background text-text-primary">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const queryKey = query.queryKey;
              // Exclude 'messages' and 'chat' queries from persistence because they are high frequency
              if (Array.isArray(queryKey) && (queryKey[0] === 'messages' || queryKey[0] === 'chat')) {
                return false;
              }
              return true;
            },
          },
        }}
      >
        <AuthProvider>
          <ToastProvider>
            <WebSocketProvider>
              <ThemeProvider>
                <LocationProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />

                      {/* Protected Routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                          <Route path="/" element={<Home />} />
                          <Route path="/create-story" element={<CreateStory />} />
                          <Route path="/view-story" element={<ViewStory />} />
                          <Route path="/view-story/:id" element={<ViewStory />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/profile/:id" element={<Profile />} />
                          <Route path="/connections" element={<Connections />} />
                          <Route path="/explore" element={<Explore />} />
                          <Route path="/map" element={<StoryMap />} />
                          <Route path="/messages" element={<Chat />} />
                          <Route path="/chat" element={<Chat />} />
                          <Route path="/crossings" element={<Crossings />} />
                          <Route path="/settings" element={<Settings />} />
                        </Route>
                      </Route>

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </LocationProvider>
              </ThemeProvider>
            </WebSocketProvider>
          </ToastProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </BrowserRouter>
  );
}

export default App;

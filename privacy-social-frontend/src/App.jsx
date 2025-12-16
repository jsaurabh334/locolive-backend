import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreateStory from './pages/CreateStory';
import ViewStory from './pages/ViewStory';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Connections from './pages/Connections';
import Chat from './pages/Chat';
import StoryMap from './pages/StoryMap';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LocationProvider>
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
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/connections" element={<Connections />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/map" element={<StoryMap />} />
                  <Route path="/messages" element={<Chat />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LocationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

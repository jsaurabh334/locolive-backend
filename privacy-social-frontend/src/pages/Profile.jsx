import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyProfile, useUserProfile } from '../features/profile/useProfile';
import { useAuth } from '../context/AuthContext';
import { useConnections, usePendingRequests, useSentRequests, useSendRequest, useRemoveConnection } from '../features/connections/useConnections';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import EditProfile from '../features/profile/EditProfile';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import ErrorState from '../components/ui/ErrorState';
import ReportModal from '../components/ReportModal';

const Profile = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isOwnProfile = !id || id === user?.id;

    const { data: myProfile, isLoading: loadingMyProfile, error: myError } = useMyProfile();
    const { data: otherProfile, isLoading: loadingOtherProfile, error: otherError } = useUserProfile(id, !isOwnProfile);

    const profile = isOwnProfile ? myProfile : otherProfile;
    const isLoading = isOwnProfile ? loadingMyProfile : loadingOtherProfile;
    const error = isOwnProfile ? myError : otherError;

    const [isEditing, setIsEditing] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Fetch activity status
    const { data: activityStatus } = useQuery({
        queryKey: ['activity-status'],
        queryFn: async () => {
            const res = await apiClient.getActivityStatus();
            return res.data;
        },
        enabled: isOwnProfile
    });

    // Fetch profile visitors
    const { data: visitors } = useQuery({
        queryKey: ['profile-visitors'],
        queryFn: async () => {
            const res = await apiClient.getProfileVisitors();
            return res.data;
        },
        enabled: isOwnProfile
    });

    // Connection Logic
    const { data: connections } = useConnections();
    const { data: pendingRequests } = usePendingRequests();
    const { data: sentRequests } = useSentRequests();
    const sendRequest = useSendRequest();
    const removeConnection = useRemoveConnection();

    const connectionStatus = useMemo(() => {
        if (isOwnProfile || !profile) return null;
        if (connections?.some(c => c.id === profile.id)) return 'connected';
        if (pendingRequests?.some(r => r.requester_id === profile.id)) return 'incoming';
        if (sentRequests?.some(r => r.target_id === profile.id)) return 'sent';
        return 'none';
    }, [connections, pendingRequests, sentRequests, profile, isOwnProfile]);

    const handleConnect = () => {
        if (profile?.id) {
            sendRequest.mutate(profile.id);
        }
    };

    const handleCancelRequest = () => {
        if (profile?.id) {
            removeConnection.mutate(profile.id);
        }
    };

    // Profile Boost
    const boostMutation = useMutation({
        mutationFn: () => apiClient.boostProfile(),
        onSuccess: () => {
            queryClient.invalidateQueries(['my-profile']);
            alert('Profile boosted! You\'ll appear higher in discovery for the next 24 hours.');
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to boost profile');
        }
    });

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center min-h-[50vh]">
                <Loader size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <ErrorState
                title="Error Loading Profile"
                message={error.message}
                onRetry={() => window.location.reload()}
            />
        );
    }

    const userDisplay = profile || {
        username: 'User',
        full_name: 'Unknown',
        bio: 'No bio yet.'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-20">
            {/* Enhanced Header Banner */}
            <div className="h-48 bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-600 relative shadow-2xl">
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Profile Content */}
            <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
                {/* Avatar & Name Card */}
                <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 mb-6">
                    <div className="flex flex-col items-center">
                        {/* Avatar with Gradient Ring */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
                            <div className="relative p-1.5 rounded-full bg-gradient-to-r from-primary-500 to-purple-500">
                                <div className="w-32 h-32 rounded-full bg-background flex items-center justify-center overflow-hidden">
                                    {userDisplay.avatar_url ? (
                                        <img src={userDisplay.avatar_url} alt={userDisplay.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-bold text-primary-500">
                                            {userDisplay.username?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Name & Username */}
                        <h1 className="text-3xl font-bold text-text-primary mb-2">{userDisplay.full_name}</h1>
                        <p className="text-text-secondary mb-4">@{userDisplay.username}</p>

                        {/* Bio */}
                        {userDisplay.bio && (
                            <p className="text-center text-text-secondary italic max-w-md">
                                "{userDisplay.bio}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Stories Stat */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center group">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-2xl">📸</span>
                        </div>
                        <span className="block text-2xl font-bold text-text-primary mb-1">{userDisplay.story_count || 0}</span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Stories</span>
                    </div>

                    {/* Connections Stat */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center group">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-2xl">👥</span>
                        </div>
                        <span className="block text-2xl font-bold text-text-primary mb-1">{userDisplay.connection_count || 0}</span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Friends</span>
                    </div>

                    {/* Activity/Status Stat */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center group">
                        <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${activityStatus?.visibility_status === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            activityStatus?.visibility_status === 'fading' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                                'bg-gradient-to-br from-gray-500 to-slate-500'
                            }`}>
                            <span className="text-2xl">⚡</span>
                        </div>
                        <span className={`block text-2xl font-bold mb-1 ${activityStatus?.visibility_status === 'active' ? 'text-green-500' :
                            activityStatus?.visibility_status === 'fading' ? 'text-yellow-500' :
                                'text-gray-500'
                            }`}>
                            {isOwnProfile ? (activityStatus?.visibility_status || 'Active') : 'Active'}
                        </span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Status</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {isOwnProfile ? (
                    <div className="space-y-4">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            ✏️ Edit Profile
                        </button>

                        {profile?.is_premium && (
                            <button
                                onClick={() => boostMutation.mutate()}
                                disabled={boostMutation.isPending}
                                className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                            >
                                🚀 {boostMutation.isPending ? 'Boosting...' : 'Boost Profile (24h)'}
                            </button>
                        )}

                        {/* Profile Visitors */}
                        {visitors && visitors.length > 0 && (
                            <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
                                        <span className="text-xl">👁️</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">Recent Visitors</h3>
                                        <p className="text-xs text-text-tertiary">Last 24 hours</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {visitors.slice(0, 5).map(visitor => (
                                        <div
                                            key={visitor.id}
                                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover cursor-pointer transition-all"
                                            onClick={() => navigate(`/profile/${visitor.id}`)}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                                                {visitor.avatar_url ? (
                                                    <img src={visitor.avatar_url} alt={visitor.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    visitor.username[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-text-primary truncate">{visitor.full_name}</p>
                                                <p className="text-sm text-text-secondary">@{visitor.username}</p>
                                            </div>
                                            <span className="text-xs text-text-tertiary">
                                                {new Date(visitor.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {connectionStatus === 'connected' ? (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Remove ${userDisplay.username} from connections?`)) {
                                            removeConnection.mutate(profile.id);
                                        }
                                    }}
                                    disabled={removeConnection.isPending}
                                    className="px-6 py-3 rounded-2xl bg-surface/60 backdrop-blur-sm border border-border/50 hover:bg-surface-hover text-text-primary font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    ✓ Friends
                                </button>
                            ) : connectionStatus === 'incoming' ? (
                                <button
                                    onClick={() => navigate('/connections')}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Respond
                                </button>
                            ) : connectionStatus === 'sent' ? (
                                <button
                                    onClick={handleCancelRequest}
                                    disabled={removeConnection.isPending}
                                    className="px-6 py-3 rounded-2xl bg-surface/60 backdrop-blur-sm border border-border/50 hover:bg-surface-hover text-text-primary font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Cancel Request
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnect}
                                    disabled={sendRequest.isPending}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    + Connect
                                </button>
                            )}
                            {connectionStatus === 'connected' && (
                                <button
                                    onClick={() => navigate('/messages', { state: { selectedUser: profile } })}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    💬 Message
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full px-6 py-3 rounded-2xl bg-surface/60 backdrop-blur-sm border border-red-500/30 hover:bg-red-500/10 text-red-500 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            🚩 Report User
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isEditing && <EditProfile profile={profile} onClose={() => setIsEditing(false)} />}
            {showReportModal && (
                <ReportModal
                    type="user"
                    targetId={profile?.id}
                    onClose={() => setShowReportModal(false)}
                />
            )}
        </div>
    );
};

export default Profile;

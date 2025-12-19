import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyProfile, useUserProfile } from '../features/profile/useProfile';
import { useAuth } from '../context/AuthContext';
import { useConnections, usePendingRequests, useSentRequests, useSendRequest, useRemoveConnection } from '../features/connections/useConnections';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getMediaUrl } from '../api/client';
import EditProfile from '../features/profile/EditProfile';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import ErrorState from '../components/ui/ErrorState';
import ReportModal from '../components/ReportModal';
import SkeletonLoader from '../components/ui/SkeletonLoader';

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
        queryKey: ['activity-status', user?.id], // Scoped to user ID
        queryFn: async () => {
            const res = await apiClient.getActivityStatus(user?.id);
            return res.data;
        },
        enabled: !!user?.id
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

        // Check optimistically updated lists first
        if (connections?.some(c => c.id === profile.id)) return 'connected';
        if (pendingRequests?.some(r => r.requester_id === profile.id)) return 'incoming';
        if (sentRequests?.some(r => r.target_id === profile.id)) return 'sent';

        // Check profile's own status if lists haven't synced yet (fallback)
        if (profile.connection_status === 'pending') return 'sent';
        if (profile.connection_status === 'connected') return 'connected';

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
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            alert('Profile boosted! You\'ll appear higher in discovery for the next 24 hours.');
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to boost profile');
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-20">
                <div className="h-48 bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-600 relative shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10 space-y-6">
                    <SkeletonLoader variant="profile" />
                    <div className="grid grid-cols-3 gap-4">
                        <SkeletonLoader variant="card" />
                        <SkeletonLoader variant="card" />
                        <SkeletonLoader variant="card" />
                    </div>
                </div>
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
        bio: 'No bio yet.',
        links: []
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
                <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 mb-6 group">
                    <div className="flex flex-col items-center">
                        {/* Avatar with Animated Pulse Ring & Glow */}
                        <div className="relative mb-6">
                            {/* Outer Pulse Ring - Online Status (Public if Story Active) */}
                            {activityStatus?.visibility_status === 'active' && (
                                <div className="absolute inset-0 rounded-full">
                                    <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping"></div>
                                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse"></div>
                                </div>
                            )}

                            {/* Glowing Background Blur */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse"></div>

                            {/* Gradient Ring with Depth */}
                            <div className="relative p-1.5 rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 shadow-2xl group-hover:shadow-primary-500/50 transition-all duration-300 group-hover:scale-105">
                                <div className="w-32 h-32 rounded-full bg-background flex items-center justify-center overflow-hidden ring-4 ring-background/50 group-hover:ring-primary-500/30 transition-all duration-300">
                                    {userDisplay.avatar_url ? (
                                        <img
                                            src={getMediaUrl(userDisplay.avatar_url)}
                                            alt={userDisplay.username}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <span className="text-5xl font-bold text-primary-500 group-hover:scale-110 transition-transform duration-300">
                                            {userDisplay.username?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>

                                {/* Online Status Indicator (Public if Story Active) */}
                                {activityStatus?.visibility_status === 'active' && (
                                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-lg">
                                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name & Username with Premium Typography Hierarchy */}
                        <h1 className="text-4xl font-bold text-text-primary mb-1 group-hover:text-primary-500 transition-colors duration-300 tracking-tight">
                            {userDisplay.full_name}
                        </h1>
                        <p className="text-sm text-text-tertiary mb-6 font-normal opacity-70">@{userDisplay.username}</p>

                        {/* Bio with Lighter, Italic Styling */}
                        {userDisplay.bio && (
                            <p className="text-center text-text-secondary/80 italic font-light text-sm leading-relaxed max-w-md px-6 py-3 bg-surface/30 rounded-2xl border border-border/30 backdrop-blur-sm">
                                "{userDisplay.bio}"
                            </p>
                        )}

                        {/* Multiple Links Display */}
                        {userDisplay.links && userDisplay.links.length > 0 && (
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                {userDisplay.links.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface/40 border border-border/50 text-text-secondary hover:text-primary-500 hover:bg-surface/60 hover:border-primary-500/30 hover:scale-105 hover:shadow-lg transition-all duration-300 backdrop-blur-sm group/link"
                                    >
                                        <span className="text-sm group-hover/link:animate-bounce">
                                            {link.label?.toLowerCase() === 'twitter' || link.label?.toLowerCase() === 'x' ? '𝕏' :
                                                link.label?.toLowerCase() === 'github' ? '🐙' :
                                                    link.label?.toLowerCase() === 'linkedin' ? '💼' :
                                                        link.label?.toLowerCase() === 'instagram' ? '📸' : '🔗'}
                                        </span>
                                        <span className="text-sm font-medium tracking-wide">
                                            {link.label || 'Link'}
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 opacity-40 group-hover/link:opacity-100 transition-opacity">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Stories Stat */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-center group cursor-pointer">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-2xl">📸</span>
                        </div>
                        <span className="block text-2xl font-bold text-text-primary mb-1">{userDisplay.story_count || 0}</span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Stories</span>
                    </div>

                    {/* Connections Stat */}
                    <div
                        onClick={() => isOwnProfile && navigate('/connections')}
                        className={`bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-center group ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-2xl">👥</span>
                        </div>
                        <span className="block text-2xl font-bold text-text-primary mb-1">{userDisplay.connection_count || 0}</span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Friends</span>
                    </div>

                    {/* Activity/Status Stat */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-center group cursor-pointer">
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
                            {activityStatus?.visibility_status ? activityStatus.visibility_status.charAt(0).toUpperCase() + activityStatus.visibility_status.slice(1) : 'Hidden'}
                        </span>
                        <span className="text-xs text-text-tertiary uppercase tracking-wide">Status</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {isOwnProfile ? (
                    <div className="space-y-4">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="group w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <span className="text-lg transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">✏️</span>
                            <span>Edit Profile</span>
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
                                    {visitors.slice(0, 5).map((visitor, index) => (
                                        <div
                                            key={`visitor-${visitor.id}-${index}`}
                                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover cursor-pointer transition-all"
                                            onClick={() => navigate(`/profile/${visitor.id}`)}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                                                {visitor.avatar_url ? (
                                                    <img src={getMediaUrl(visitor.avatar_url)} alt={visitor.username} className="w-full h-full object-cover" />
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

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyProfile, useUserProfile } from '../features/profile/useProfile';
import { useAuth } from '../context/AuthContext';
import { useConnections, usePendingRequests, useSentRequests, useSendRequest, useRemoveConnection } from '../features/connections/useConnections';
import apiClient from '../api/client';
import EditProfile from '../features/profile/EditProfile';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import ErrorState from '../components/ui/ErrorState';

const Profile = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isOwnProfile = !id || id === user?.id;

    const { data: myProfile, isLoading: loadingMyProfile, error: myError } = useMyProfile();
    const { data: otherProfile, isLoading: loadingOtherProfile, error: otherError } = useUserProfile(id, !isOwnProfile);

    const profile = isOwnProfile ? myProfile : otherProfile;
    const isLoading = isOwnProfile ? loadingMyProfile : loadingOtherProfile;
    const error = isOwnProfile ? myError : otherError;

    const [isEditing, setIsEditing] = useState(false);

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

    // Placeholder for missing data
    const userDisplay = profile || {
        username: 'User',
        full_name: 'Unknown',
        bio: 'No bio yet.'
    };

    return (
        <div className="w-full h-full pb-20">
            {/* Header / Cover */}
            <div className="h-40 bg-gradient-to-r from-primary-600 to-secondary-600 relative rounded-b-3xl shadow-lg"></div>


            {/* Profile Info */}
            <div className="px-4 -mt-16 flex flex-col items-center relative z-10 w-full max-w-lg mx-auto">
                <div className="p-1.5 rounded-full bg-background">
                    <Avatar
                        src={userDisplay.avatar_url}
                        alt={userDisplay.username}
                        size="xl"
                        className="w-32 h-32 border-4 border-background"
                        status="online"
                    />
                </div>

                <div className="mt-4 text-center">
                    <h1 className="text-2xl font-bold text-text-primary">{userDisplay.full_name}</h1>
                    <p className="text-text-secondary">@{userDisplay.username}</p>
                </div>

                <div className="mt-6 w-full space-y-6">
                    <Card className="text-center" hover>
                        <p className="text-text-secondary italic">
                            "{userDisplay.bio || 'Your bio lives here.'}"
                        </p>
                    </Card>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="text-center p-3" noPadding>
                            <span className="block text-xl font-bold text-text-primary">{userDisplay.story_count || 0}</span>
                            <span className="text-xs text-text-tertiary uppercase tracking-wide">Stories</span>
                        </Card>
                        <Card className="text-center p-3" noPadding>
                            <span className="block text-xl font-bold text-text-primary">{connections?.length || 0}</span>
                            <span className="text-xs text-text-tertiary uppercase tracking-wide">Friends</span>
                        </Card>
                        <Card className="text-center p-3" noPadding>
                            <span className="block text-xl font-bold text-green-500">Active</span>
                            <span className="text-xs text-text-tertiary uppercase tracking-wide">Status</span>
                        </Card>
                    </div>

                    {isOwnProfile ? (
                        <Button
                            variant="secondary"
                            width="full"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                {connectionStatus === 'connected' ? (
                                    <Button variant="secondary" width="full" disabled>Friends</Button>
                                ) : connectionStatus === 'incoming' ? (
                                    <Button variant="primary" width="full" onClick={() => navigate('/connections')}>Respond</Button>
                                ) : connectionStatus === 'sent' ? (
                                    <Button
                                        variant="secondary"
                                        width="full"
                                        onClick={handleCancelRequest}
                                        isLoading={removeConnection.isPending}
                                    >
                                        Cancel Request
                                    </Button>
                                ) : (
                                    <Button
                                        variant="primary"
                                        width="full"
                                        onClick={handleConnect}
                                        isLoading={sendRequest.isPending}
                                    >
                                        Connect
                                    </Button>
                                )}
                                <Button variant="secondary" width="full" onClick={() => navigate('/messages', { state: { selectedUser: profile } })}>Message</Button>
                            </div>
                            <Button
                                variant="ghost"
                                width="full"
                                className="text-red-400 hover:bg-red-500/10"
                                onClick={() => {
                                    if (window.confirm(`Are you sure you want to block ${userDisplay.username}? They won't be able to see your content or message you.`)) {
                                        apiClient.blockUser(profile.id).then(() => {
                                            navigate('/settings');
                                        }).catch(err => {
                                            console.error("Failed to block user", err);
                                            alert("Failed to block user");
                                        });
                                    }
                                }}
                            >
                                Block User
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isEditing && <EditProfile profile={userDisplay} onClose={() => setIsEditing(false)} />}
        </div>
    );
};

export default Profile;

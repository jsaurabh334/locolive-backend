import React, { useState } from 'react';
import { useConnections, usePendingRequests, useSentRequests, useUpdateConnection, useRemoveConnection, useSearchUsers, useSendRequest } from '../features/connections/useConnections';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

const Connections = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'pending', 'sent'
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { data: connections, isLoading: loadingConnections } = useConnections();
    const { data: requests, isLoading: loadingRequests } = usePendingRequests();
    const { data: sentRequests, isLoading: loadingSent } = useSentRequests();
    const { data: searchResults, isLoading: loadingSearch } = useSearchUsers(debouncedSearch);

    const updateConnection = useUpdateConnection();
    const removeConnection = useRemoveConnection();
    const sendRequest = useSendRequest();

    // Debounce effect
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAccept = (user) => {
        updateConnection.mutate(
            { requesterId: user.requester_id || user.id, status: 'accepted' },
            {
                onSuccess: () => {
                    if (requests.length <= 1) setActiveTab('active');
                }
            }
        );
    };

    const handleReject = (user) => {
        removeConnection.mutate(user.requester_id || user.id);
    };

    const handleCancel = (user) => {
        removeConnection.mutate(user.target_id || user.id);
    }

    const handleConnect = (targetId) => {
        sendRequest.mutate(targetId);
    }

    const handleRemove = (user) => {
        if (window.confirm(`Are you sure you want to remove ${user.username} from connections?`)) {
            removeConnection.mutate(user.id);
        }
    };

    const getConnectionStatus = (targetId) => {
        if (targetId === currentUser?.id) return 'self';
        if (connections?.some(c => c.id === targetId)) return 'friends';
        if (sentRequests?.some(r => r.target_id === targetId)) return 'sent';
        if (requests?.some(r => r.requester_id === targetId)) return 'pending';
        return 'none';
    };

    return (
        <div className="w-full h-full pb-20 pt-safe">
            {/* Header */}
            <div className="flex flex-col border-b border-border sticky top-0 bg-background/95 backdrop-blur z-20">
                <div className="flex items-center gap-4 px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </Button>
                    <h1 className="text-xl font-bold text-text-primary">Connections</h1>
                </div>

                {/* Search Bar */}
                <div className="px-4 pb-3">
                    <Input
                        placeholder="Search for people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-surface-hover border-transparent focus:bg-surface"
                    />
                </div>
            </div>

            {/* Search Results Overlay */}
            {debouncedSearch && (
                <div className="p-4 space-y-3 min-h-[50vh]">
                    <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Search Results</h2>
                    {loadingSearch ? (
                        <Loader />
                    ) : searchResults?.length === 0 ? (
                        <p className="text-text-secondary text-center py-8">No users found.</p>
                    ) : (
                        searchResults.map(user => {
                            const status = getConnectionStatus(user.id);
                            return (
                                <Card key={user.id} className="flex items-center justify-between p-3" noPadding>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => navigate(`/profile/${user.id}`)}
                                    >
                                        <Avatar src={user.avatar_url} alt={user.username} />
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-text-primary truncate">{user.full_name}</h3>
                                            <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {status === 'self' ? (
                                            <span className="text-xs text-text-tertiary font-medium px-3 py-1">You</span>
                                        ) : status === 'friends' ? (
                                            <Button size="sm" variant="secondary" disabled>Friends</Button>
                                        ) : status === 'sent' ? (
                                            <Button size="sm" variant="secondary" onClick={() => handleCancel({ target_id: user.id })} isLoading={removeConnection.isPending} >Cancel</Button>
                                        ) : status === 'pending' ? (
                                            <Button size="sm" variant="primary" onClick={() => handleAccept({ requester_id: user.id })} isLoading={updateConnection.isPending}>Accept</Button>
                                        ) : (
                                            <Button size="sm" variant="primary" onClick={() => handleConnect(user.id)} isLoading={sendRequest.isPending && sendRequest.variables === user.id}>Connect</Button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            )}

            {/* Tabs & Lists (Hide if searching) */}
            {!debouncedSearch && (
                <>
                    <div className="flex px-4 items-center border-b border-border">
                        <button
                            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'active' ? 'text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Friends
                            {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-400 rounded-t-full" />}
                        </button>
                        <button
                            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'pending' ? 'text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending
                            {requests?.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {requests.length}
                                </span>
                            )}
                            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-400 rounded-t-full" />}
                        </button>
                        <button
                            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${activeTab === 'sent' ? 'text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setActiveTab('sent')}
                        >
                            Sent
                            {activeTab === 'sent' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-400 rounded-t-full" />}
                        </button>
                    </div>

                    <div className="p-4 space-y-3">
                        {activeTab === 'active' && (
                            <>
                                {loadingConnections ? (
                                    <Loader className="mt-8" />
                                ) : connections?.length === 0 ? (
                                    <EmptyState
                                        title="No connections yet"
                                        message="Find people to start connecting!"
                                    />
                                ) : (
                                    connections?.map(user => (
                                        <Card key={user.id} className="flex items-center justify-between p-3" noPadding>
                                            <div
                                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                                onClick={() => navigate(`/profile/${user.id}`)}
                                            >
                                                <Avatar src={user.avatar_url} alt={user.username} />
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-text-primary truncate">{user.full_name}</h3>
                                                    <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => navigate('/messages', { state: { selectedUser: user } })}>
                                                    Message
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleRemove(user)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === 'pending' && (
                            <>
                                {loadingRequests ? (
                                    <Loader className="mt-8" />
                                ) : requests?.length === 0 ? (
                                    <EmptyState title="No pending requests" />
                                ) : (
                                    requests?.map(user => (
                                        <Card key={user.requester_id} className="p-3 bg-surface-hover/20 border-primary-500/20" noPadding>
                                            <div
                                                className="flex items-center gap-3 mb-3 cursor-pointer"
                                                onClick={() => navigate(`/profile/${user.requester_id}`)}
                                            >
                                                <Avatar src={user.avatar_url} alt={user.username} />
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-text-primary truncate">{user.full_name}</h3>
                                                    <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                                                    <p className="text-[10px] text-text-tertiary">Requested {new Date(user.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    width="full"
                                                    onClick={() => handleAccept(user)}
                                                    isLoading={updateConnection.isPending && updateConnection.variables?.requesterId === (user.requester_id || user.id)}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    width="full"
                                                    onClick={() => handleReject(user)}
                                                    isLoading={removeConnection.isPending && removeConnection.variables === (user.requester_id || user.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === 'sent' && (
                            <>
                                {loadingSent ? (
                                    <Loader className="mt-8" />
                                ) : sentRequests?.length === 0 ? (
                                    <EmptyState title="No sent requests" />
                                ) : (
                                    sentRequests?.map(user => (
                                        <Card key={user.target_id} className="p-3 bg-surface/50 border-border" noPadding>
                                            <div
                                                className="flex items-center gap-3 mb-3 cursor-pointer"
                                                onClick={() => navigate(`/profile/${user.target_id}`)}
                                            >
                                                <Avatar src={user.avatar_url} alt={user.username} />
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-text-primary truncate">{user.full_name}</h3>
                                                    <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                                                    <p className="text-[10px] text-text-tertiary">Sent {new Date(user.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    width="full"
                                                    onClick={() => handleCancel(user)}
                                                    isLoading={removeConnection.isPending && removeConnection.variables === user.target_id}
                                                >
                                                    Cancel Request
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Connections;

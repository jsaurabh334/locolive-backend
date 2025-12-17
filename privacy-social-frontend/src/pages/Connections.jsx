import React, { useState } from 'react';
import { useConnections, usePendingRequests, useSentRequests, useUpdateConnection, useRemoveConnection, useSearchUsers, useSendRequest, useSuggestedConnections } from '../features/connections/useConnections';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

// Premium Card Component
const UserCard = ({ user, action, children }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 backdrop-blur-md rounded-2xl transition-all duration-300 p-4"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0" onClick={action} role="button">
                <Avatar src={user.avatar_url} alt={user.username} size="lg" className="ring-2 ring-white/10 group-hover:ring-primary-500/50 transition-all duration-300" />
                <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{user.full_name}</h3>
                    <p className="text-sm text-text-secondary truncate">@{user.username}</p>
                    {user.mutual_count > 0 && (
                        <p className="text-xs text-primary-400 mt-0.5">{user.mutual_count} mutual connections</p>
                    )}
                </div>
            </div>
            <div className="flex gap-2 relative z-10">
                {children}
            </div>
        </div>
    </motion.div>
);

const Connections = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { data: connections, isLoading: loadingConnections } = useConnections();
    const { data: requests, isLoading: loadingRequests } = usePendingRequests();
    const { data: sentRequests, isLoading: loadingSent } = useSentRequests();
    const { data: searchResults, isLoading: loadingSearch } = useSearchUsers(debouncedSearch);
    const { data: suggested, isLoading: loadingSuggested } = useSuggestedConnections();

    const updateConnection = useUpdateConnection();
    const removeConnection = useRemoveConnection();
    const sendRequest = useSendRequest();

    // Debounce effect
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAccept = (user) => updateConnection.mutate({ requesterId: user.requester_id || user.id, status: 'accepted' });
    const handleReject = (user) => removeConnection.mutate(user.requester_id || user.id);
    const handleCancel = (user) => removeConnection.mutate(user.target_id || user.id);
    const handleConnect = (targetId) => sendRequest.mutate(targetId);
    const handleRemove = (user) => {
        if (window.confirm(`Remove ${user.username}?`)) removeConnection.mutate(user.id);
    };

    const getConnectionStatus = (targetId) => {
        if (targetId === currentUser?.id) return 'self';
        if (connections?.some(c => c.id === targetId)) return 'friends';
        if (sentRequests?.some(r => r.target_id === targetId)) return 'sent';
        if (requests?.some(r => r.requester_id === targetId)) return 'pending';
        return 'none';
    };

    const tabs = [
        { id: 'active', label: 'Friends' },
        { id: 'pending', label: 'Pending', count: requests?.length },
        { id: 'sent', label: 'Sent' },
    ];

    return (
        <div className="w-full min-h-screen pb-24 pt-safe bg-background">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-xl z-30 border-b border-white/5 pb-2">
                <div className="flex items-center gap-4 px-4 py-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2 hover:bg-white/5 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </Button>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">Connections</h1>
                </div>

                {/* Search Bar */}
                <div className="px-4 mb-2">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-primary-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Find new connections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Tabs */}
                {!debouncedSearch && (
                    <div className="flex px-4 mt-2 gap-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative px-4 py-2 text-sm font-semibold transition-colors duration-300",
                                    activeTab === tab.id ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
                                )}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/10 rounded-full"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-lg shadow-primary-500/20">
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 space-y-6">

                {/* Search Results */}
                <AnimatePresence mode="popLayout">
                    {debouncedSearch ? (
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest ml-1">Search Results</h2>
                            {loadingSearch ? <Loader /> : searchResults?.length === 0 ? (
                                <p className="text-text-secondary text-center py-12">No users found.</p>
                            ) : (
                                searchResults.map(user => {
                                    const status = getConnectionStatus(user.id);
                                    let button = null;

                                    if (status === 'self') button = <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full text-text-secondary">You</span>;
                                    else if (status === 'friends') button = <Button size="sm" variant="secondary" disabled>Connected</Button>;
                                    else if (status === 'sent') button = <Button size="sm" variant="ghost" onClick={() => handleCancel({ target_id: user.id })} isLoading={removeConnection.isPending} >Cancel</Button>;
                                    else if (status === 'pending') button = <Button size="sm" variant="primary" onClick={() => handleAccept({ requester_id: user.id })} isLoading={updateConnection.isPending}>Accept</Button>;
                                    else button = <Button size="sm" variant="primary" onClick={() => handleConnect(user.id)} isLoading={sendRequest.isPending && sendRequest.variables === user.id}>Connect</Button>;

                                    return <UserCard key={user.id} user={user} action={() => navigate(`/profile/${user.id}`)}>{button}</UserCard>;
                                })
                            )}
                        </div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Suggested Rail - Only show on Friends tab or if list is empty */}
                            {suggested?.length > 0 && activeTab === 'active' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6"
                                >
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Suggested for you</h2>
                                        <button className="text-xs text-primary-400 font-semibold hover:text-primary-300">View All</button>
                                    </div>
                                    <div className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
                                        {suggested.map((user, i) => (
                                            <motion.div
                                                key={user.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="snap-start min-w-[160px] max-w-[160px] bg-gradient-to-br from-white/10 to-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 backdrop-blur-md hover:border-primary-500/30 transition-colors group cursor-pointer"
                                                onClick={() => navigate(`/profile/${user.id}`)}
                                            >
                                                <div className="relative">
                                                    <Avatar src={user.avatar_url} alt={user.username} size="lg" className="ring-4 ring-background group-hover:scale-105 transition-transform duration-300" />
                                                    {user.mutual_count > 0 && (
                                                        <div className="absolute -bottom-1 -right-1 bg-surface border border-border text-[10px] text-text-primary px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                            🤝 {user.mutual_count}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="font-bold text-text-primary text-sm truncate w-full">{user.username}</h3>
                                                    <p className="text-[10px] text-text-secondary truncate w-full">
                                                        {user.mutual_count > 0 ? 'Mutual connections' : 'New to app'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="xs"
                                                    variant="primary"
                                                    className="w-full mt-1 bg-white/10 hover:bg-white/20 text-white border-0 shadow-none backdrop-blur-sm"
                                                    onClick={(e) => { e.stopPropagation(); handleConnect(user.id); }}
                                                    isLoading={sendRequest.isPending && sendRequest.variables === user.id}
                                                >
                                                    Connect
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'active' && (
                                <div className="space-y-3">
                                    {loadingConnections ? <Loader /> : connections?.length === 0 ? (
                                        <EmptyState title="No connections yet" message="Start connecting to see updates!" />
                                    ) : (
                                        connections.map((user) => (
                                            <UserCard key={user.id} user={user} action={() => navigate(`/profile/${user.id}`)}>
                                                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate('/messages', { state: { selectedUser: user } }) }}>Message</Button>
                                                <div className="relative group/menu">
                                                    <button className="p-2 text-text-tertiary hover:text-text-primary rounded-full hover:bg-white/10" onClick={(e) => { e.stopPropagation(); handleRemove(user) }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </UserCard>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'pending' && (
                                <div className="space-y-3">
                                    {loadingRequests ? <Loader /> : requests?.length === 0 ? <EmptyState title="No pending requests" /> : (
                                        requests.map((user) => (
                                            <UserCard key={user.requester_id} user={user} action={() => navigate(`/profile/${user.requester_id}`)}>
                                                <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleAccept(user); }} isLoading={updateConnection.isPending}>Accept</Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleReject(user); }} isLoading={removeConnection.isPending}>Reject</Button>
                                            </UserCard>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'sent' && (
                                <div className="space-y-3">
                                    {loadingSent ? <Loader /> : sentRequests?.length === 0 ? <EmptyState title="No sent requests" /> : (
                                        sentRequests.map((user) => (
                                            <UserCard key={user.target_id} user={user} action={() => navigate(`/profile/${user.target_id}`)}>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCancel(user); }} isLoading={removeConnection.isPending}>Cancel</Button>
                                            </UserCard>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Connections;

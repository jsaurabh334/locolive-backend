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

// Premium Card Component with Micro-interactions
const UserCard = ({ user, action, children }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group relative overflow-hidden bg-surface/60 backdrop-blur-sm hover:bg-surface/80 border border-border/50 hover:border-primary-500/30 rounded-3xl transition-all duration-300 p-6 shadow-xl hover:shadow-2xl cursor-pointer"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0" onClick={action} role="button">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                    <Avatar
                        src={user.avatar_url}
                        alt={user.username}
                        size="lg"
                        className="relative ring-2 ring-border/30 group-hover:ring-primary-500/50 transition-all duration-300 group-hover:scale-105"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-text-primary truncate text-lg">{user.full_name}</h3>
                    <p className="text-sm text-text-secondary truncate">@{user.username}</p>
                    {user.mutual_count > 0 && (
                        <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                            <span>🤝</span> {user.mutual_count} mutual connections
                        </p>
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

    // Update local state on cancel
    const handleCancel = (user) => {
        removeConnection.mutate(user.target_id || user.id);
    };

    // Update local state on connect
    const handleConnect = (targetId) => {
        sendRequest.mutate(targetId);
    };

    const handleRemove = (user) => {
        if (window.confirm(`Remove ${user.username}?`)) removeConnection.mutate(user.id);
    };

    const getConnectionStatus = (targetId) => {
        if (targetId === currentUser?.id) return 'self';

        // Check optimistically updated lists
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
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-24">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-xl bg-background/80 border-b border-border/30 z-30">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-surface-hover transition-all hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-text-secondary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                            Connections
                        </h1>
                        <p className="text-xs text-text-tertiary mt-1">Build your network • Share stories • Stay connected</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="max-w-4xl mx-auto px-6 pb-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-primary-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Find new connections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-surface/60 backdrop-blur-sm border border-border/50 rounded-2xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 focus:bg-surface/80 transition-all font-medium shadow-lg"
                        />
                    </div>
                </div>

                {/* Tabs */}
                {!debouncedSearch && (
                    <div className="max-w-4xl mx-auto px-6 flex gap-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 rounded-t-xl",
                                    activeTab === tab.id
                                        ? "text-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                        : "text-text-tertiary hover:text-text-secondary opacity-60 hover:opacity-100"
                                )}
                            >
                                {activeTab === tab.id && (
                                    <>
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-surface/60 backdrop-blur-sm border border-border/50 border-b-0 rounded-t-xl shadow-lg"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                        {/* Animated Underline */}
                                        <motion.div
                                            layoutId="activeTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    </>
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-primary-500/30 font-bold">
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* Search Results */}
                <AnimatePresence mode="popLayout">
                    {debouncedSearch ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                                    <span className="text-xl">🔍</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary">Search Results</h2>
                                    <p className="text-xs text-text-tertiary">Found {searchResults?.length || 0} users</p>
                                </div>
                            </div>
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
                                    className="mb-8"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                                                <span className="text-xl">✨</span>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-text-primary">Suggested for You</h2>
                                                <p className="text-xs text-text-tertiary">People you may know</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x snap-mandatory no-scrollbar">
                                        {suggested.map((user, i) => (
                                            <motion.div
                                                key={user.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="snap-start min-w-[180px] max-w-[180px] bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-5 flex flex-col items-center gap-4 hover:border-primary-500/30 hover:shadow-2xl transition-all duration-300 group cursor-pointer"
                                                onClick={() => navigate(`/profile/${user.id}`)}
                                            >
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                                                    <Avatar
                                                        src={user.avatar_url}
                                                        alt={user.username}
                                                        size="xl"
                                                        className="relative ring-4 ring-background group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                    {user.mutual_count > 0 && (
                                                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-primary-500 to-primary-600 border-2 border-background text-[10px] text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-lg font-bold">
                                                            🤝 {user.mutual_count}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="font-bold text-text-primary text-sm truncate w-full mb-1">{user.full_name}</h3>
                                                    <p className="text-xs text-text-secondary truncate w-full">@{user.username}</p>
                                                    <p className="text-[10px] text-text-tertiary mt-1">
                                                        {user.mutual_count > 0 ? 'Mutual connections' : 'New to app'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 border-0 shadow-lg"
                                                    onClick={(e) => { e.stopPropagation(); handleConnect(user.id); }}
                                                    isLoading={sendRequest.isPending && sendRequest.variables === user.id}
                                                >
                                                    + Connect
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
                                    {loadingRequests ? <Loader /> : requests?.length === 0 ? <EmptyState title="No pending requests" message="You're all caught up 🎉" /> : (
                                        requests.map((user) => (
                                            <UserCard key={`pending-${user.requester_id}`} user={user} action={() => navigate(`/profile/${user.requester_id}`)}>
                                                <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleAccept(user); }} isLoading={updateConnection.isPending}>Accept</Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleReject(user); }} isLoading={removeConnection.isPending}>Reject</Button>
                                            </UserCard>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'sent' && (
                                <div className="space-y-3">
                                    {loadingSent ? <Loader /> : sentRequests?.length === 0 ? <EmptyState title="No sent requests" message="Find people to connect with above" /> : (
                                        sentRequests.map((user) => (
                                            <UserCard key={`sent-${user.target_id}`} user={user} action={() => navigate(`/profile/${user.target_id}`)}>
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

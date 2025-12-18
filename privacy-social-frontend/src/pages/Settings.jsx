import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Settings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
            {/* Floating Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-surface-hover transition-all hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-text-secondary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                            Settings
                        </h1>
                        <p className="text-[10px] md:text-xs text-text-tertiary">Manage your privacy & preferences</p>
                    </div>
                </div>
            </div>

            {/* Single Scroll Layout */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
                {/* Privacy & Visibility Section */}
                <PrivacySettings />

                {/* Account & Security Section */}
                <AccountSettings user={user} />

                {/* Appearance Section */}
                <AppearanceSettings />
            </div>
        </div>
    );
};

// Privacy Settings - Redesigned
const PrivacySettings = () => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['privacy-settings'],
        queryFn: async () => {
            const res = await apiClient.getPrivacySettings();
            return res.data;
        },
    });

    const updatePrivacyMutation = useMutation({
        mutationFn: (newSettings) => apiClient.updatePrivacySettings(newSettings),
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries(['privacy-settings']);
            const previousSettings = queryClient.getQueryData(['privacy-settings']);
            queryClient.setQueryData(['privacy-settings'], (old) => ({ ...old, ...newSettings }));
            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            queryClient.setQueryData(['privacy-settings'], context.previousSettings);
        },
        onSettled: () => {
            queryClient.invalidateQueries(['privacy-settings']);
        }
    });

    const handleChange = (key, value) => {
        if (!settings) return;

        const payload = {
            who_can_message: settings.who_can_message,
            who_can_see_stories: settings.who_can_see_stories,
            show_location: settings.show_location,
            [key]: value
        };

        updatePrivacyMutation.mutate(payload);
    };

    if (isLoading) return <div className="text-text-secondary animate-pulse">Loading...</div>;

    return (
        <div className="space-y-6">
            {/* Privacy Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl">🔒</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-text-primary">Privacy & Visibility</h2>
                    <p className="text-xs text-text-tertiary">Control who sees what</p>
                </div>
            </div>

            {/* Main Privacy Card */}
            <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 space-y-6">
                {/* Story Visibility */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">👁️</span>
                        <label className="text-sm font-semibold text-text-primary">Story Visibility</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['everyone', 'connections', 'nobody'].map(option => (
                            <button
                                key={option}
                                onClick={() => handleChange('who_can_see_stories', option)}
                                className={`group px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${settings?.who_can_see_stories === option
                                    ? 'bg-primary-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4),inset_0_0_20px_rgba(255,255,255,0.1)] scale-110'
                                    : 'bg-background/70 text-text-secondary hover:bg-surface-hover hover:scale-105'
                                    }`}
                            >
                                <span className={`inline-block text-base transition-transform duration-300 ${settings?.who_can_see_stories === option ? 'scale-125' : 'group-hover:scale-110'}`}>
                                    {option === 'everyone' ? '🌍' : option === 'connections' ? '👥' : '🚫'}
                                </span>
                                <span className="block text-xs mt-1 capitalize">{option}</span>
                            </button>
                        ))}
                    </div>
                    {/* Helper Text */}
                    <p className="text-xs text-text-tertiary leading-relaxed px-1">
                        {settings?.who_can_see_stories === 'everyone' && '🌍 Anyone nearby can discover and view your stories'}
                        {settings?.who_can_see_stories === 'connections' && '👥 Only your connections can see your stories'}
                        {settings?.who_can_see_stories === 'nobody' && '🚫 Your stories are hidden from everyone'}
                    </p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>

                {/* Message Privacy */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <label className="text-sm font-semibold text-text-primary">Who Can Message</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['everyone', 'connections', 'nobody'].map(option => (
                            <button
                                key={option}
                                onClick={() => handleChange('who_can_message', option)}
                                className={`group px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${settings?.who_can_message === option
                                    ? 'bg-primary-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4),inset_0_0_20px_rgba(255,255,255,0.1)] scale-110'
                                    : 'bg-background/70 text-text-secondary hover:bg-surface-hover hover:scale-105'
                                    }`}
                            >
                                <span className={`inline-block text-base transition-transform duration-300 ${settings?.who_can_message === option ? 'scale-125' : 'group-hover:scale-110'}`}>
                                    {option === 'everyone' ? '🌍' : option === 'connections' ? '👥' : '🚫'}
                                </span>
                                <span className="block text-xs mt-1 capitalize">{option}</span>
                            </button>
                        ))}
                    </div>
                    {/* Helper Text */}
                    <p className="text-xs text-text-tertiary leading-relaxed px-1">
                        {settings?.who_can_message === 'everyone' && '🌍 Anyone can send you messages'}
                        {settings?.who_can_message === 'connections' && '👥 Only your connections can message you'}
                        {settings?.who_can_message === 'nobody' && '🚫 No one can send you messages'}
                    </p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>

                {/* Location Toggle */}
                <label className="flex items-center justify-between p-4 rounded-2xl bg-background/50 cursor-pointer hover:bg-background/70 transition-all group">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Share Location</p>
                            <p className="text-xs text-text-secondary">Show approximate location</p>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={settings?.show_location ?? true}
                            onChange={(e) => handleChange('show_location', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-hover rounded-full peer peer-checked:bg-primary-500 transition-all"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                    </div>
                </label>

                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>

                {/* Ghost Mode */}
                <GhostModeToggle />
            </div>

            {/* Blocked Users */}
            <BlockedUsersList />
        </div>
    );
};

// Ghost Mode Toggle - Redesigned with Danger/Power Treatment
const GhostModeToggle = () => {
    const { user, setAuth, updateUser } = useAuth();
    const queryClient = useQueryClient();
    const [showConfirm, setShowConfirm] = useState(false);

    const toggleGhostMode = useMutation({
        mutationFn: (enabled) => apiClient.toggleGhostMode(enabled),
        onMutate: async (enabled) => {
            // Optimistically update using updateUser for proper reactivity
            console.log('onMutate: Updating is_ghost_mode to', enabled);
            updateUser({ is_ghost_mode: enabled });
            return { previousValue: user?.is_ghost_mode };
        },
        onSuccess: async (response, variables, context) => {
            console.log('onSuccess: Backend returned user with is_ghost_mode:', response.data?.is_ghost_mode);
            // The toggle API now returns the updated user object directly
            if (response.data) {
                setAuth(response.data, localStorage.getItem('access_token'));
            }
            queryClient.invalidateQueries(['my-profile']);
            setShowConfirm(false);
        },
        onError: (error, variables, context) => {
            console.error('Failed to toggle ghost mode:', error);
            // Rollback on error
            if (context?.previousValue !== undefined) {
                updateUser({ is_ghost_mode: context.previousValue });
            }
            setShowConfirm(false);
        }
    });

    const handleToggle = (enabled) => {
        if (enabled && !showConfirm) {
            // Show confirmation for enabling ghost mode
            setShowConfirm(true);
        } else if (enabled && showConfirm) {
            // Confirmed - proceed
            console.log('Ghost Mode toggle clicked, new value:', enabled);
            console.log('Current user.is_ghost_mode:', user?.is_ghost_mode);
            toggleGhostMode.mutate(enabled);
        } else {
            // Disabling - no confirmation needed
            console.log('Ghost Mode toggle clicked, new value:', enabled);
            toggleGhostMode.mutate(enabled);
        }
    };

    return (
        <div className="relative">
            <label className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${user?.is_ghost_mode
                ? 'bg-gradient-to-br from-red-500/20 via-purple-500/20 to-pink-500/20 border-2 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/30 hover:shadow-lg'
                }`}>
                <div className="flex items-center gap-3">
                    <span className={`text-2xl transition-transform duration-300 ${user?.is_ghost_mode ? 'animate-pulse scale-125' : 'group-hover:scale-110'}`}>
                        👻
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-text-primary">Ghost Mode</p>
                            {user?.is_ghost_mode && (
                                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-red-500 to-purple-500 text-white rounded-full animate-pulse shadow-lg">
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-text-secondary">Become invisible on map & feed</p>
                        {user?.is_ghost_mode && (
                            <p className="text-xs text-red-400 font-medium mt-1">⚠️ You're completely hidden</p>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={!!user?.is_ghost_mode}
                        onChange={(e) => handleToggle(e.target.checked)}
                        disabled={toggleGhostMode.isPending}
                        className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full transition-all ${user?.is_ghost_mode
                        ? 'bg-gradient-to-r from-red-500 to-purple-500 shadow-lg'
                        : 'bg-surface-hover'
                        }`}></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                </div>
            </label>

            {/* Confirmation Tooltip */}
            {showConfirm && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-gradient-to-br from-red-500/90 to-purple-500/90 backdrop-blur-xl rounded-xl border border-red-500/50 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-white font-semibold mb-2">⚠️ Enable Ghost Mode?</p>
                    <p className="text-xs text-white/80 mb-3">You'll be completely invisible to everyone</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleToggle(true)}
                            className="flex-1 px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/30 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Blocked Users - Compact Design
const BlockedUsersList = () => {
    const queryClient = useQueryClient();
    const { data: blockedUsers, isLoading } = useQuery({
        queryKey: ['blocked-users'],
        queryFn: async () => {
            const res = await apiClient.getBlockedUsers();
            return res.data;
        }
    });

    const unblockMutation = useMutation({
        mutationFn: (userId) => apiClient.unblockUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries(['blocked-users']);
        }
    });

    if (isLoading) return null;
    if (!blockedUsers || blockedUsers.length === 0) return null;

    return (
        <div className="bg-surface/60 backdrop-blur-sm border border-red-500/20 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🚫</span>
                <h3 className="text-sm font-bold text-text-primary">Blocked Users</h3>
                <span className="ml-auto text-xs text-text-tertiary">{blockedUsers.length}</span>
            </div>
            <div className="space-y-2">
                {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-background/50 rounded-xl hover:bg-background/70 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.username[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-text-primary">{user.username}</span>
                        </div>
                        <button
                            onClick={() => unblockMutation.mutate(user.id)}
                            disabled={unblockMutation.isPending}
                            className="text-xs text-red-400 hover:text-red-500 font-medium transition-colors"
                        >
                            Unblock
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Account Settings - Redesigned
const AccountSettings = ({ user }) => {
    const queryClient = useQueryClient();
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [email, setEmail] = useState('');
    useEffect(() => {
        if (user?.email) setEmail(user.email);
    }, [user]);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const updateEmailMutation = useMutation({
        mutationFn: (email) => apiClient.updateEmail(email),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['auth-user']);
            queryClient.setQueryData(['auth-user'], (old) => ({ ...old, email: data.email }));
            setIsEmailModalOpen(false);
            alert("Email updated successfully!");
        },
        onError: (err) => {
            console.error("Failed to update email", err);
            alert(err.response?.data?.error || "Failed to update email");
        }
    });

    const updatePasswordMutation = useMutation({
        mutationFn: ({ current, newPass }) => apiClient.updatePassword(current, newPass),
        onSuccess: () => {
            setIsPasswordModalOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            alert("Password updated successfully!");
        },
        onError: (err) => {
            console.error("Failed to update password", err);
            alert(err.response?.data?.error || "Failed to update password");
        }
    });

    return (
        <div className="space-y-6">
            {/* Account & Security Section Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl">⚙️</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-text-primary">Account & Security</h2>
                        {/* Security Status Indicator */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-semibold text-green-500">Secure</span>
                        </span>
                    </div>
                    <p className="text-xs text-text-tertiary">Manage credentials & data</p>
                </div>
            </div>

            {/* Credentials Card with Border Glow */}
            <div className="bg-surface/60 backdrop-blur-sm border-2 border-green-500/20 rounded-3xl p-6 shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.25)] hover:border-green-500/30 transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl hover:bg-background/70 transition-all group">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📧</span>
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Email</p>
                            <p className="text-xs text-text-secondary">{user?.email || 'Not set'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-medium text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                    >
                        Change
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl hover:bg-background/70 transition-all group">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔑</span>
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Password</p>
                            <p className="text-xs text-text-secondary">••••••••</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-medium text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-500/30 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">⚠️</span>
                    <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                </div>
                <PanicModeButton />
            </div>

            {/* Modals */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-lg animate-fade-in">
                    <div className="bg-surface border border-border/60 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-text-primary">Update Email</h3>
                        <input
                            type="email"
                            placeholder="New Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-inner"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setIsEmailModalOpen(false)}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={() => updateEmailMutation.mutate(email)}
                                isLoading={updateEmailMutation.isPending}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-lg animate-fade-in">
                    <div className="bg-surface border border-border/60 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-text-primary">Change Password</h3>
                        <input
                            type="password"
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-inner"
                        />
                        <input
                            type="password"
                            placeholder="New Password (min 6 chars)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-inner"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={() => updatePasswordMutation.mutate({ current: currentPassword, newPass: newPassword })}
                                isLoading={updatePasswordMutation.isPending}
                                disabled={!currentPassword || newPassword.length < 6}
                            >
                                Update
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Panic Mode - Redesigned
const PanicModeButton = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const panicMutation = useMutation({
        mutationFn: () => apiClient.panicMode(),
        onSuccess: () => {
            alert('All your data has been permanently deleted.');
            logout();
            navigate('/login');
        },
        onError: (error) => {
            alert(error.response?.data?.error || 'Failed to activate panic mode');
        }
    });

    const handlePanic = () => {
        if (confirmText !== 'DELETE') {
            alert('Please type DELETE to confirm');
            return;
        }
        panicMutation.mutate();
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
                <span>🚨</span>
                <span>Delete All My Data</span>
            </button>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-xl animate-fade-in">
                    <div className="bg-surface border-2 border-red-500/50 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
                        <div className="flex items-start gap-3">
                            <span className="text-4xl">⚠️</span>
                            <div>
                                <h3 className="text-xl font-bold text-red-400">Panic Mode</h3>
                                <p className="text-sm text-text-secondary mt-1">This cannot be undone!</p>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                            <p className="text-sm text-text-primary font-semibold mb-2">Will permanently delete:</p>
                            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                                <li>All stories and posts</li>
                                <li>All messages and conversations</li>
                                <li>All connections and requests</li>
                                <li>Profile and account data</li>
                                <li>Location history</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-primary mb-2">
                                Type <span className="text-red-400">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                                className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-inner"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowConfirm(false);
                                    setConfirmText('');
                                }}
                                disabled={panicMutation.isPending}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handlePanic}
                                isLoading={panicMutation.isPending}
                                disabled={confirmText !== 'DELETE'}
                                className="flex-1 bg-red-500 hover:bg-red-600"
                            >
                                Delete Everything
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Appearance Settings - Redesigned
const AppearanceSettings = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl">🎨</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-text-primary">Appearance</h2>
                    <p className="text-xs text-text-tertiary">Customize your experience</p>
                </div>
            </div>

            <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <label className="block text-sm font-semibold text-text-primary mb-4">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: 'light', label: 'Light', icon: '☀️', gradient: 'from-yellow-400 to-orange-400' },
                        { value: 'dark', label: 'Dark', icon: '🌙', gradient: 'from-indigo-500 to-purple-500' },
                        { value: 'auto', label: 'Auto', icon: '🔄', gradient: 'from-blue-500 to-cyan-500' }
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={`p-5 rounded-2xl border-2 transition-all ${theme === option.value
                                ? 'border-primary-500 bg-primary-500/10 shadow-xl scale-105'
                                : 'border-border/40 hover:border-primary-500/50 hover:shadow-lg'
                                }`}
                        >
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                                {option.icon}
                            </div>
                            <div className="text-sm font-semibold text-text-primary">{option.label}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;
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
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'privacy', label: 'Privacy', icon: '🔒' },
        { id: 'account', label: 'Account', icon: '⚙️' },
        { id: 'appearance', label: 'Appearance', icon: '🎨' },
    ];

    return (
        <div className="h-full flex flex-col pb-safe">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-30">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </Button>
                <h1 className="text-xl font-bold text-text-primary">Settings</h1>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-64 border-r border-border bg-surface/30 p-4 space-y-1 overflow-y-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                                ? 'bg-primary-500 text-white'
                                : 'text-text-secondary hover:bg-surface-hover'
                                }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'profile' && <ProfileSettings user={user} />}
                    {activeTab === 'privacy' && <PrivacySettings />}
                    {activeTab === 'account' && <AccountSettings user={user} />}
                    {activeTab === 'appearance' && <AppearanceSettings />}
                </div>
            </div>
        </div>
    );
};

// Profile Settings Tab
const ProfileSettings = ({ user }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        bio: user?.bio || '',
        username: user?.username || ''
    });

    // Update local state when user prop changes (e.g. after refetch)
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                bio: user.bio || '',
                username: user.username || ''
            });
        }
    }, [user]);

    const updateProfileMutation = useMutation({
        mutationFn: (data) => apiClient.updateProfile(data),
        onSuccess: (updatedUser) => {
            // Update auth user data in cache
            queryClient.invalidateQueries(['auth-user']);
            // Also update query cache for getMyProfile
            queryClient.setQueryData(['my-profile'], updatedUser);
        }
    });

    const handleSave = () => {
        updateProfileMutation.mutate(formData);
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Profile Information</h2>
                <p className="text-text-secondary">Update your profile details and how others see you</p>
            </div>

            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-text-tertiary mt-1">Username can be changed</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Full Name</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Bio</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                            maxLength={150}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-24"
                        />
                        <p className="text-xs text-text-tertiary mt-1">{formData.bio.length}/150 characters</p>
                    </div>

                    <Button
                        onClick={handleSave}
                        isLoading={updateProfileMutation.isPending}
                        className="w-full"
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>

                    {updateProfileMutation.isSuccess && (
                        <p className="text-green-500 text-sm text-center mt-2">Profile updated successfully!</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

// Privacy Settings Tab
const PrivacySettings = () => {
    const queryClient = useQueryClient();

    // Fetch privacy settings
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
            // Optimistic update
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

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Privacy & Security</h2>
                <p className="text-text-secondary">Control who can see your content and interact with you</p>
            </div>

            <Card>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-3">Who can see your stories?</label>
                        <div className="space-y-2">
                            {['everyone', 'connections', 'nobody'].map(option => (
                                <label key={option} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover cursor-pointer">
                                    <input
                                        type="radio"
                                        name="who_can_see_stories"
                                        value={option}
                                        checked={settings?.who_can_see_stories === option}
                                        onChange={(e) => handleChange('who_can_see_stories', e.target.value)}
                                        className="w-4 h-4 text-primary-500"
                                    />
                                    <span className="text-text-primary capitalize">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <label className="block text-sm font-medium text-text-primary mb-3">Who can message you?</label>
                        <div className="space-y-2">
                            {['everyone', 'connections', 'nobody'].map(option => (
                                <label key={option} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover cursor-pointer">
                                    <input
                                        type="radio"
                                        name="who_can_message"
                                        value={option}
                                        checked={settings?.who_can_message === option}
                                        onChange={(e) => handleChange('who_can_message', e.target.value)}
                                        className="w-4 h-4 text-primary-500"
                                    />
                                    <span className="text-text-primary capitalize">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover cursor-pointer">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Show Location</p>
                                <p className="text-xs text-text-secondary mt-1">Allow others to see your approximate location</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings?.show_location ?? true}
                                onChange={(e) => handleChange('show_location', e.target.checked)}
                                className="w-5 h-5 text-primary-500 rounded"
                            />
                        </label>
                    </div>
                </div>
            </Card>

            <BlockedUsersList />
        </div>
    );
};

// Component to manage blocked users
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

    return (
        <Card className="border-red-500/10">
            <h3 className="font-bold text-text-primary mb-4">Blocked Users</h3>
            {blockedUsers?.length === 0 ? (
                <p className="text-text-secondary text-sm">You haven't blocked anyone.</p>
            ) : (
                <div className="space-y-3">
                    {blockedUsers?.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface border border-border overflow-hidden">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-secondary">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <span className="font-medium text-text-primary">{user.username}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-500"
                                onClick={() => unblockMutation.mutate(user.id)}
                                isLoading={unblockMutation.isPending}
                            >
                                Unblock
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

// Account Settings Tab
const AccountSettings = ({ user }) => {
    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Account Settings</h2>
                <p className="text-text-secondary">Manage your account and data</p>
            </div>

            <Card>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-hover rounded-lg">
                        <div>
                            <p className="font-medium text-text-primary">Email</p>
                            <p className="text-sm text-text-secondary">{user?.email || 'Not set'}</p>
                        </div>
                        <Button variant="ghost" size="sm">Change</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-hover rounded-lg">
                        <div>
                            <p className="font-medium text-text-primary">Password</p>
                            <p className="text-sm text-text-secondary">••••••••</p>
                        </div>
                        <Button variant="ghost" size="sm">Change</Button>
                    </div>
                </div>
            </Card>

            <Card className="border-red-500/20">
                <div className="space-y-4">
                    <h3 className="font-bold text-red-400">Danger Zone</h3>
                    <Button variant="ghost" className="w-full text-red-400 hover:bg-red-500/10">
                        Delete Account
                    </Button>
                </div>
            </Card>
        </div>
    );
};



// Appearance Settings Tab
const AppearanceSettings = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Appearance</h2>
                <p className="text-text-secondary">Customize how the app looks</p>
            </div>

            <Card>
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-text-primary mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'light', label: 'Light', icon: '☀️' },
                            { value: 'dark', label: 'Dark', icon: '🌙' },
                            { value: 'auto', label: 'Auto', icon: '🔄' }
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setTheme(option.value)}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === option.value
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-border hover:border-primary-500/50'
                                    }`}
                            >
                                <div className="text-3xl mb-2">{option.icon}</div>
                                <div className="text-sm font-medium text-text-primary">{option.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Settings;

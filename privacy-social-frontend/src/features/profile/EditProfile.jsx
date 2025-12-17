import { useState } from 'react';
import { useUpdateProfile } from './useProfile';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../api/client';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const EditProfile = ({ profile, onClose }) => {
    const { setAuth } = useAuth();
    const [formData, setFormData] = useState({
        username: profile?.username || '',
        full_name: profile?.full_name || '',
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || '',
    });
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiService.uploadFile(formData);
            setFormData(prev => ({ ...prev, avatar_url: response.data.url }));
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const { mutate: updateProfile, isPending } = useUpdateProfile();

    const handleSubmit = async (e) => {
        e.preventDefault();
        updateProfile(formData, {
            onSuccess: async (data) => {
                // Update auth store with new profile data
                const response = await apiService.getMyProfile();
                if (response.data) {
                    setAuth(response.data, localStorage.getItem('access_token'));
                }
                onClose();
            }
        });
    };

    return (
        <Modal title="Edit Profile" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload Section */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
                        <div className="relative p-1 rounded-full bg-gradient-to-r from-primary-500 to-purple-500">
                            <div className="h-28 w-28 rounded-full bg-background overflow-hidden flex items-center justify-center">
                                {formData.avatar_url ? (
                                    <img src={formData.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-primary-500 text-4xl font-bold">
                                        {formData.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <label className="absolute bottom-0 right-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full p-2 cursor-pointer hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                    {formData.avatar_url && (
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                            Remove Photo
                        </button>
                    )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
                            placeholder="username"
                        />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Full Name</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Bio</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                            maxLength={150}
                            className="w-full px-4 py-3 bg-background/70 border-0 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none h-24 shadow-inner"
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-text-tertiary">{formData.bio.length}/150</p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    isLoading={isPending || isUploading}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg"
                >
                    {isPending || isUploading ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </Modal>
    );
};

export default EditProfile;

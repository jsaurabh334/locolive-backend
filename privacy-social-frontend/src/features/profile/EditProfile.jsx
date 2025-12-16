import { useState } from 'react';
import { useUpdateProfile } from './useProfile';
import apiService from '../../api/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const EditProfile = ({ profile, onClose }) => {
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

    const handleSubmit = (e) => {
        e.preventDefault();
        updateProfile(formData, {
            onSuccess: () => {
                onClose();
            }
        });
    };

    return (
        <Modal title="Edit Profile" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center space-y-3 mb-4">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-full bg-neutral-800 border-2 border-neutral-700 overflow-hidden">
                            {formData.avatar_url ? (
                                <img src={formData.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-500 text-3xl font-bold">
                                    {formData.username?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-1.5 cursor-pointer hover:bg-primary-600 transition-colors shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Remove Photo
                        </button>
                    )}
                </div>

                <Input
                    id="full_name"
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />

                <Input
                    id="username"
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />

                <div className="space-y-1.5">
                    <label htmlFor="bio" className="text-sm font-medium text-text-secondary">Bio</label>
                    <textarea
                        id="bio"
                        rows={3}
                        className="
                            w-full px-4 py-3 rounded-xl bg-surface border border-border
                            text-text-primary placeholder:text-text-tertiary
                            focus:outline-none focus:ring-2 focus:ring-primary-500/50
                            resize-none
                        "
                        placeholder="Tell us about yourself..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <Button type="submit" isLoading={isPending || isUploading} width="full">
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditProfile;

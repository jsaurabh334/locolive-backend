import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../../api/client';
import Loader from '../ui/Loader';
import { useConnections } from '../../features/connections/useConnections';

import { useToast } from '../../context/ToastContext';

const ShareModal = ({ storyId, onClose }) => {
    const toast = useToast();
    const { data: connections, isLoading } = useConnections();

    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState(null);

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleShare = async () => {
        if (selectedUsers.length === 0) return;

        setIsSharing(true);
        setError(null);
        try {
            await apiService.shareStory({
                story_id: storyId,
                user_ids: selectedUsers
            });
            toast.success("Story shared successfully!");
            onClose();
        } catch (error) {
            // console.error('Failed to share story:', error);
            setError('Failed to share story. Please try again.');
            toast.error("Failed to share story.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-elevated rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Share Story</h2>
                        <button
                            onClick={onClose}
                            className="text-text-secondary hover:text-text-primary"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <Loader />
                    ) : connections && connections.length > 0 ? (
                        <div className="space-y-2">
                            {connections.map((connection) => (
                                <div
                                    key={connection.id}
                                    onClick={() => toggleUser(connection.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedUsers.includes(connection.id)
                                        ? 'bg-primary-500/20 border-2 border-primary-500'
                                        : 'bg-surface hover:bg-surface-hover border-2 border-transparent'
                                        }`}
                                >
                                    <img
                                        src={connection.avatar_url || '/default-avatar.png'}
                                        alt={connection.username}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">{connection.username}</p>
                                        <p className="text-sm text-text-secondary">{connection.full_name}</p>
                                    </div>
                                    {selectedUsers.includes(connection.id) && (
                                        <span className="text-primary-500">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-text-secondary py-8">
                            No connections to share with
                        </p>
                    )}
                </div>

                <div className="p-4 border-t border-border">
                    <button
                        onClick={handleShare}
                        disabled={selectedUsers.length === 0 || isSharing}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isSharing ? 'Sharing...' : `Share with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Crossings = () => {
    const navigate = useNavigate();
    const [selectedUser, setSelectedUser] = useState(null);

    const { data: crossings, isLoading } = useQuery({
        queryKey: ['crossings'],
        queryFn: async () => {
            const res = await apiClient.getCrossings();
            return res.data;
        },
    });

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const crossedAt = new Date(timestamp);
        const diffMs = now - crossedAt;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="h-full flex flex-col pb-safe">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-30">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-text-primary">Path Crossings</h1>
                    <p className="text-xs text-text-secondary">People whose paths you've crossed</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : crossings?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="text-6xl mb-4">🚶</div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">No Crossings Yet</h3>
                        <p className="text-text-secondary max-w-sm">
                            When you cross paths with other users in the same location, they'll appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-2xl mx-auto">
                        {crossings?.map((crossing) => (
                            <Card key={crossing.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div
                                        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl cursor-pointer overflow-hidden"
                                        onClick={() => navigate(`/profile/${crossing.user_id}`)}
                                    >
                                        {crossing.avatar_url ? (
                                            <img src={crossing.avatar_url} alt={crossing.username} className="w-full h-full object-cover" />
                                        ) : (
                                            crossing.username[0].toUpperCase()
                                        )}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold text-text-primary cursor-pointer hover:text-primary-500"
                                            onClick={() => navigate(`/profile/${crossing.user_id}`)}
                                        >
                                            {crossing.full_name || crossing.username}
                                        </h3>
                                        <p className="text-sm text-text-secondary">@{crossing.username}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-tertiary">
                                                🗺️ Crossed {crossing.crossing_count} {crossing.crossing_count === 1 ? 'time' : 'times'}
                                            </span>
                                            <span className="text-xs text-text-tertiary">•</span>
                                            <span className="text-xs text-text-tertiary">
                                                {formatTimeAgo(crossing.last_crossing_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => navigate(`/profile/${crossing.user_id}`)}
                                    >
                                        View Profile
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Crossings;

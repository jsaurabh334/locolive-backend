import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import Button from '../components/ui/Button';
import UserCard from '../components/UserCard';

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
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-24">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-xl bg-background/80 border-b border-border/30 z-30">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-surface-hover transition-all hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-text-secondary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <span className="text-xl">🚶</span>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                                Path Crossings
                            </h1>
                            <p className="text-[10px] md:text-xs text-text-tertiary mt-0.5">People you almost met in real life ✨</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : crossings?.length === 0 ? (
                    <div className="space-y-6">
                        {/* Main Empty State */}
                        <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-12 shadow-xl text-center">
                            <div className="text-6xl mb-4">🚶</div>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">No Crossings Yet</h3>
                            <p className="text-text-secondary max-w-sm mx-auto mb-6">
                                When you cross paths with other users in the same location, they'll appear here.
                            </p>

                            {/* How It Works Section */}
                            <div className="max-w-md mx-auto mt-8 p-6 bg-gradient-to-br from-primary-500/5 to-purple-500/5 rounded-2xl border border-primary-500/10">
                                <h4 className="text-sm font-semibold text-text-primary mb-4 flex items-center justify-center gap-2">
                                    <span>💡</span> How Path Crossings Work
                                </h4>
                                <div className="space-y-3 text-left">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">📍</span>
                                        <div>
                                            <p className="text-xs font-medium text-text-primary">Visit Places</p>
                                            <p className="text-xs text-text-tertiary">Go to cafes, parks, or events</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">👥</span>
                                        <div>
                                            <p className="text-xs font-medium text-text-primary">Cross Paths</p>
                                            <p className="text-xs text-text-tertiary">Be in the same area as other users</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">✨</span>
                                        <div>
                                            <p className="text-xs font-medium text-text-primary">Discover</p>
                                            <p className="text-xs text-text-tertiary">See who you almost met in real life</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tips Card */}
                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/20 rounded-3xl p-6 shadow-xl">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <h4 className="text-sm font-semibold text-text-primary mb-2">Tips for More Crossings</h4>
                                    <ul className="space-y-2 text-xs text-text-secondary">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <span>Keep location services enabled for accurate tracking</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <span>Visit popular spots where other users hang out</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <span>Check back regularly to see new crossings</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Single Crossing Context Message */}
                        {crossings?.length === 1 && (
                            <div className="bg-gradient-to-br from-primary-500/10 to-purple-500/10 backdrop-blur-sm border border-primary-500/20 rounded-2xl p-4 text-center">
                                <p className="text-sm font-semibold text-text-primary mb-1">
                                    You have 1 recent crossing ✨
                                </p>
                                <p className="text-xs text-text-tertiary">
                                    More appear as you explore
                                </p>
                            </div>
                        )}

                        {/* Privacy Info Banner */}
                        <div className="bg-gradient-to-br from-primary-500/10 to-purple-500/10 backdrop-blur-sm border border-primary-500/20 rounded-2xl p-4">
                            <div className="flex items-center justify-center gap-6 text-xs text-text-tertiary">
                                <div className="flex items-center gap-2">
                                    <span>🔒</span>
                                    <span>Approximate location only</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>⏱️</span>
                                    <span>No real-time tracking</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>👻</span>
                                    <span>Ghost mode available</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {crossings?.map((crossing) => (
                                <UserCard
                                    key={crossing.id}
                                    user={crossing}
                                    onClick={() => navigate(`/profile/${crossing.user_id}`)}
                                    title={formatTimeAgo(crossing.last_crossing_at)}
                                    subtitle={`${crossing.crossing_count} ${crossing.crossing_count === 1 ? 'Meeting' : 'Meetings'}`}
                                >
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="w-full bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/profile/${crossing.user_id}`);
                                        }}
                                    >
                                        Say Hi 👋
                                    </Button>
                                </UserCard>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Crossings;

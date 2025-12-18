import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuggestedConnections, useSendRequest } from '../../features/connections/useConnections';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const RightSidebar = () => {
    const navigate = useNavigate();
    const { data: suggested, isLoading } = useSuggestedConnections();
    const sendRequest = useSendRequest();

    const handleConnect = (e, userId) => {
        e.stopPropagation();
        sendRequest.mutate(userId);
    };

    if (isLoading) {
        return (
            <aside className="hidden xl:block fixed right-0 top-0 bottom-0 w-80 border-l border-white/5 bg-background/50 backdrop-blur-xl p-6 overflow-y-auto">
                <div className="space-y-6">
                    <section>
                        <h3 className="text-xs font-bold text-text-tertiary mb-4 uppercase tracking-widest">Suggested for you</h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 opacity-50">
                                    <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                                        <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </aside>
        );
    }

    if (!suggested || suggested.length === 0) return null;

    return (
        <aside className="hidden xl:block fixed right-0 top-0 bottom-0 w-80 border-l border-white/5 bg-background/50 backdrop-blur-xl p-6 overflow-y-auto z-10">
            <div className="space-y-6">
                <section>
                    <h3 className="text-xs font-bold text-text-tertiary mb-4 uppercase tracking-widest">Suggested for you</h3>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {suggested.slice(0, 5).map((user, index) => (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group relative bg-surface/30 hover:bg-surface/50 border border-border/20 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/10"
                                    onClick={() => navigate(`/profile/${user.id}`)}
                                >
                                    {/* Avatar with Online Indicator */}
                                    <div className="relative">
                                        <Avatar src={user.avatar_url} alt={user.username} size="md" />
                                        {user.is_online && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background">
                                                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-text-primary text-sm truncate group-hover:text-primary-500 transition-colors">
                                            {user.username}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {user.mutual_count > 0 ? (
                                                <>
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-primary-400 font-medium bg-primary-500/10 px-1.5 py-0.5 rounded-full">
                                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                        </svg>
                                                        {user.mutual_count} mutual{user.mutual_count !== 1 ? 's' : ''}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-text-tertiary">New to app</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Follow Button - Always Visible */}
                                    <Button
                                        size="xs"
                                        className="bg-primary-500 hover:bg-primary-600 text-white border-0 shadow-md hover:shadow-lg transition-all group-hover:scale-105 font-semibold px-4"
                                        onClick={(e) => handleConnect(e, user.id)}
                                        isLoading={sendRequest.isPending && sendRequest.variables === user.id}
                                    >
                                        Follow
                                    </Button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>

                <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] text-text-tertiary leading-relaxed font-medium">
                        © 2025 Privacy Social.<br />
                        Privacy • Terms • Cookies
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;

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
                    <div className="space-y-1">
                        <AnimatePresence>
                            {suggested.slice(0, 5).map(user => (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors group relative"
                                    onClick={() => navigate(`/profile/${user.id}`)}
                                >
                                    <Avatar src={user.avatar_url} alt={user.username} size="md" />

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-text-primary text-sm truncate">{user.username}</h4>
                                        <p className="text-[10px] text-text-secondary truncate">
                                            {user.mutual_count > 0 ? `${user.mutual_count} mutuals` : 'New to app'}
                                        </p>
                                    </div>

                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        className="bg-white/5 hover:bg-white/10 border-0 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                        onClick={(e) => handleConnect(e, user.id)}
                                        isLoading={sendRequest.isPending && sendRequest.variables === user.id}
                                    >
                                        Add
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

import { motion } from 'framer-motion';
import Avatar from './ui/Avatar';

const UserCard = ({ user, onClick, children, title, subtitle }) => {
    // Professional, subtle gradients aligned with brand (purple/blue/slate)
    const gradients = [
        'from-primary-500/80 to-primary-700/80',
        'from-secondary-500/80 to-secondary-700/80',
        'from-slate-700 to-slate-800',
    ];
    // Use a stable hash for gradient selection so it doesn't change on re-render
    const gradientIndex = ((user.username || 'user').charCodeAt(0)) % gradients.length;
    const bannerGradient = gradients[gradientIndex];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="group relative bg-surface/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col"
            onClick={onClick}
        >
            {/* Banner Section */}
            <div className={`h-24 bg-gradient-to-br ${bannerGradient} relative`}>
                <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                {/* Subtle curve or texture could go here */}
            </div>

            {/* Content Section */}
            <div className="flex-1 px-6 pb-6 pt-0 flex flex-col items-center -mt-12 relative z-10">
                {/* Avatar */}
                <div className="p-1.5 bg-surface rounded-full mb-3 shadow-lg ring-1 ring-white/10">
                    <Avatar
                        src={user.avatar_url}
                        alt={user.username}
                        size="xl"
                        className="w-20 h-20 ring-4 ring-surface"
                    />
                </div>

                {/* Text Info */}
                <h3 className="text-xl font-bold text-text-primary text-center mb-1 drop-shadow-sm">
                    {user.full_name || user.username}
                </h3>

                {title && (
                    <p className="text-xs font-bold text-text-tertiary text-center uppercase tracking-widest mb-1.5">
                        {title}
                    </p>
                )}

                {subtitle ? (
                    <p className="text-sm text-primary-400 font-medium text-center mb-5 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                        {subtitle}
                    </p>
                ) : (
                    <p className="text-sm text-text-secondary text-center mb-5">
                        @{user.username}
                    </p>
                )}

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-2 opacity-50"></div>

                {/* Actions / Stats */}
                <div className="w-full mt-2">
                    {children ? (
                        <div className="flex justify-center gap-2 mt-2 w-full">
                            {children}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 divide-x divide-border/50 text-center">
                            <div className="px-2">
                                <span className="block font-bold text-text-primary">75</span>
                                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Posts</span>
                            </div>
                            <div className="px-2">
                                <span className="block font-bold text-text-primary">42</span>
                                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Friends</span>
                            </div>
                            <div className="px-2">
                                <span className="block font-bold text-text-primary">1.2k</span>
                                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Views</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Privacy Indicator */}
                <div className="w-full mt-4 pt-3 border-t border-border/30">
                    <p className="text-[10px] text-text-tertiary text-center flex items-center justify-center gap-1">
                        <span>🔒</span>
                        <span>Location hidden • Time approximated</span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default UserCard;

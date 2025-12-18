import React from 'react';

const SkeletonLoader = ({ variant = 'default', className = '' }) => {
    const variants = {
        // Card skeleton
        card: (
            <div className={`bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 animate-pulse ${className}`}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                        <div className="h-3 bg-white/10 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-white/10 rounded"></div>
                    <div className="h-3 bg-white/10 rounded w-5/6"></div>
                </div>
            </div>
        ),

        // Profile skeleton
        profile: (
            <div className={`bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 animate-pulse ${className}`}>
                <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-white/10 rounded-full mb-6"></div>
                    <div className="h-8 bg-white/10 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-32 mb-6"></div>
                    <div className="h-12 bg-white/10 rounded-2xl w-64"></div>
                </div>
            </div>
        ),

        // List item skeleton
        list: (
            <div className={`flex items-center gap-3 p-3 rounded-xl bg-surface/30 animate-pulse ${className}`}>
                <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4"></div>
                    <div className="h-2 bg-white/10 rounded w-1/2"></div>
                </div>
            </div>
        ),

        // Text skeleton
        text: (
            <div className={`space-y-2 animate-pulse ${className}`}>
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                <div className="h-4 bg-white/10 rounded w-4/6"></div>
            </div>
        ),

        // Default skeleton
        default: (
            <div className={`h-20 bg-white/10 rounded-xl animate-pulse ${className}`}></div>
        )
    };

    return variants[variant] || variants.default;
};

export default SkeletonLoader;

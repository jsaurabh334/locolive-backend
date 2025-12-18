const Avatar = ({ src, alt, size = 'md', className = '', status }) => {
    const sizes = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-24 h-24",
    };

    const statusColors = {
        online: "bg-green-500",
        busy: "bg-red-500",
        away: "bg-yellow-500",
        offline: "bg-neutral-500",
    };

    // Generate a consistent random avatar based on the user's name
    const getDefaultAvatar = () => {
        const seed = alt || 'User';
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`${sizes[size]} rounded-full overflow-hidden border border-border bg-neutral-800`}>
                <img
                    src={src || getDefaultAvatar()}
                    alt={alt || "Avatar"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = getDefaultAvatar(); }}
                />
            </div>
            {status && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${statusColors[status]}`}></div>
            )}
        </div>
    );
};

export default Avatar;

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

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`${sizes[size]} rounded-full overflow-hidden border border-border bg-neutral-800`}>
                <img
                    src={src || `https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`}
                    alt={alt || "Avatar"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`; }}
                />
            </div>
            {status && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${statusColors[status]}`}></div>
            )}
        </div>
    );
};

export default Avatar;

const Card = ({ children, className = '', noPadding = false, hover = false }) => {
    return (
        <div
            className={`
                bg-surface rounded-2xl border border-border overflow-hidden
                ${hover ? 'transition-transform duration-200 hover:-translate-y-1 hover:border-neutral-700 hover:shadow-xl' : ''}
                ${noPadding ? '' : 'p-4 md:p-6'}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

export default Card;

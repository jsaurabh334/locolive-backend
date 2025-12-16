import { forwardRef } from 'react';

const Button = forwardRef(({
    children,
    variant = 'primary', // primary, secondary, ghost, danger
    size = 'md', // sm, md, lg
    width = 'auto', // auto, full
    isLoading = false,
    disabled,
    className = '',
    icon,
    ...props
}, ref) => {

    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";

    const variants = {
        primary: "bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20 focus:ring-primary-500",
        secondary: "bg-surface hover:bg-surface-hover text-text-primary border border-border focus:ring-neutral-500",
        ghost: "bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary focus:ring-neutral-500",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 focus:ring-red-500",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm gap-1.5",
        md: "px-5 py-2.5 text-base gap-2",
        lg: "px-6 py-3.5 text-lg gap-2.5",
    };

    const widths = {
        auto: "w-auto",
        full: "w-full",
    };

    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widths[width]} ${className}`}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && icon && <span className="text-current">{icon}</span>}
            {children}
        </button>
    );
});

Button.displayName = "Button";
export default Button;

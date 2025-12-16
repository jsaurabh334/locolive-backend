import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-text-secondary">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={`
                    w-full px-4 py-3 rounded-xl bg-surface border 
                    text-text-primary placeholder:text-text-tertiary
                    focus:outline-none focus:ring-2 focus:ring-primary-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary-500'}
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
});

Input.displayName = "Input";
export default Input;

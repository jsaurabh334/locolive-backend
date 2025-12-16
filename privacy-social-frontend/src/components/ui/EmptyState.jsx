import Button from './Button';

const EmptyState = ({
    title = "No data found",
    message,
    actionLabel,
    onAction,
    icon
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                {icon || (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-text-tertiary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                )}
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
            {message && <p className="text-text-secondary mb-6 max-w-xs">{message}</p>}
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;

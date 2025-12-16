import Button from './Button';

const ErrorState = ({ title = "Something went wrong", message, onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
            {message && <p className="text-text-secondary mb-6 max-w-xs">{message}</p>}
            {onRetry && (
                <Button onClick={onRetry} variant="secondary">
                    Try Again
                </Button>
            )}
        </div>
    );
};

export default ErrorState;

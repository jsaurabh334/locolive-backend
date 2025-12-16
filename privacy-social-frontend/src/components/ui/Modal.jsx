import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

const Modal = ({ title, onClose, children, footer, size = 'md' }) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        full: 'max-w-full m-4',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className={`
                relative w-full ${sizes[size]} 
                bg-surface rounded-2xl shadow-2xl border border-border 
                flex flex-col max-h-[90vh] animate-scale-in
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 md:p-6 overflow-y-auto no-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 md:p-6 border-t border-border bg-surface-hover/30 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;

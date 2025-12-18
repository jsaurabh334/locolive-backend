import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastItem = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300); // Match animation duration
    };

    // Auto-dismiss logic is handled in Context, but we can also have a manual close

    const variants = {
        success: 'bg-green-500/90 border-green-400/50 text-white',
        error: 'bg-red-500/90 border-red-400/50 text-white',
        warning: 'bg-orange-500/90 border-orange-400/50 text-white',
        info: 'bg-blue-500/90 border-blue-400/50 text-white',
    };

    const icons = {
        success: '✅',
        error: '🚨',
        warning: '⚠️',
        info: 'ℹ️',
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-md mb-3 transition-all duration-300 transform
                ${variants[toast.type] || variants.info}
                ${isExiting ? 'opacity-0 translate-x-10' : 'opacity-100 translate-x-0 animate-fade-in-up'}
            `}
            role="alert"
        >
            <span className="text-lg">{icons[toast.type]}</span>
            <p className="text-sm font-medium pr-2">{toast.message}</p>
            <button
                onClick={handleRemove}
                className="ml-auto text-white/70 hover:text-white transition-colors"
            >
                ✕
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    // Render into a portal to ensure it's always on top
    const portalRoot = document.getElementById('toast-root') || document.body;

    return createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end max-w-sm w-full pointer-events-none">
            <div className="pointer-events-auto w-full">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </div>,
        portalRoot
    );
};

export default ToastContainer;

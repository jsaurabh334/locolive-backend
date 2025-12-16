import { useState } from 'react';

const REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '😢'];

const ReactionPicker = ({ onReact, currentReaction, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleReactionClick = (emoji) => {
        onReact(emoji);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="reaction-trigger p-2 rounded-full bg-black/50 hover:bg-black/70 transition disabled:opacity-50"
            >
                {currentReaction ? (
                    <span className="text-2xl">{currentReaction}</span>
                ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-surface-elevated rounded-2xl p-2 shadow-xl flex gap-2 animate-scale-in">
                    {REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleReactionClick(emoji)}
                            className={`text-2xl p-2 rounded-xl hover:bg-surface-hover transition transform hover:scale-125 ${currentReaction === emoji ? 'bg-primary-500/20' : ''
                                }`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReactionPicker;

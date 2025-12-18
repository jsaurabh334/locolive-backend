import React, { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import Loader from '../../../components/ui/Loader';
import MessageItem from './MessageItem';

const MessageList = ({
    messages,
    loadingMessages,
    currentUser,
    selectedUser,
    editingMessage,
    editContent,
    setEditContent,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onReaction,
    onSaveMessage, // New prop
    menuOpen,
    setMenuOpen,
    reactionPicker,
    setReactionPicker,
    otherTyping,
    onPoke // New prop for handling poke
}) => {
    const lastTapRef = useRef(0);
    const tapTimeoutRef = useRef(null);
    const virtuosoRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);

    // Group consecutive identical system messages
    const groupedMessages = useMemo(() => {
        if (!messages || messages.length === 0) return [];

        const grouped = [];
        let i = 0;

        while (i < messages.length) {
            const currentMsg = messages[i];

            // Check if this is a system message (poke)
            const isSystemMessage = currentMsg.content && currentMsg.content.includes('poked you 👋');

            if (isSystemMessage) {
                // Count consecutive identical system messages
                let count = 1;
                let j = i + 1;

                while (
                    j < messages.length &&
                    messages[j].content === currentMsg.content &&
                    messages[j].sender_id === currentMsg.sender_id
                ) {
                    count++;
                    j++;
                }

                // Create grouped message
                if (count > 1) {
                    grouped.push({
                        ...currentMsg,
                        content: currentMsg.content.replace('poked you 👋', `poked you ${count} times`),
                        isGrouped: true,
                        groupCount: count,
                        groupedIds: messages.slice(i, j).map(m => m.id)
                    });
                    i = j; // Skip the grouped messages
                } else {
                    grouped.push(currentMsg);
                    i++;
                }
            } else {
                grouped.push(currentMsg);
                i++;
            }
        }

        return grouped;
    }, [messages]);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (groupedMessages && groupedMessages.length > prevMessagesLengthRef.current) {
            // New message added, scroll to bottom
            if (virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({
                    index: groupedMessages.length - 1,
                    align: 'end',
                    behavior: 'smooth'
                });
            }
        }
        prevMessagesLengthRef.current = groupedMessages?.length || 0;
    }, [groupedMessages]);

    // Calculate initial scroll position - scroll to first unread message or bottom
    const getInitialScrollIndex = () => {
        if (!groupedMessages || groupedMessages.length === 0) return 0;

        // Find the first unread message (where current user is receiver and read_at is null)
        const firstUnreadIndex = groupedMessages.findIndex(
            msg => msg.sender_id !== currentUser.id && !msg.read_at
        );

        // If there are unread messages, scroll to the first one
        // Otherwise, scroll to the bottom (last message)
        return firstUnreadIndex !== -1 ? firstUnreadIndex : groupedMessages.length - 1;
    };

    const handleDoubleTap = (e) => {
        // Only trigger on the container, not on messages or media
        if (e.target.closest('.message-item') || e.target.closest('img') || e.target.closest('video')) {
            return;
        }

        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected
            if (onPoke) {
                onPoke();
            }
            lastTapRef.current = 0; // Reset
        } else {
            lastTapRef.current = now;
        }

        // Clear any existing timeout
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }

        // Reset after 300ms
        tapTimeoutRef.current = setTimeout(() => {
            lastTapRef.current = 0;
        }, 300);
    };

    return (
        <div
            className="flex-1 overflow-hidden p-2 md:p-4 z-10"
            onClick={handleDoubleTap}
            style={{ userSelect: 'none' }}
        >
            {loadingMessages ? (
                <div className="flex justify-center pt-20"><Loader /></div>
            ) : groupedMessages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
                    <span className="text-4xl mb-2">👋</span>
                    <p>Say hi to start the conversation!</p>
                </div>
            ) : (
                <Virtuoso
                    ref={virtuosoRef}
                    style={{ height: '100%' }}
                    data={groupedMessages}
                    initialTopMostItemIndex={getInitialScrollIndex()}
                    followOutput={false}
                    alignToBottom={true}
                    components={{
                        Footer: () => <div style={{ height: '20px' }} />
                    }}
                    itemContent={(index, msg) => {
                        const isMe = msg.sender_id === currentUser.id;
                        const isEditing = editingMessage === msg.id;
                        const showAvatar = !isMe && (index === 0 || groupedMessages[index - 1].sender_id !== msg.sender_id);

                        return (
                            <MessageItem
                                key={msg.id}
                                msg={msg}
                                isMe={isMe}
                                showAvatar={showAvatar}
                                selectedUser={selectedUser}
                                isEditing={isEditing}
                                editContent={editContent}
                                setEditContent={setEditContent}
                                onSaveEdit={onSaveEdit}
                                onCancelEdit={onCancelEdit}
                                onStartEdit={onStartEdit}
                                onDelete={onDelete}
                                onReaction={onReaction}
                                onSaveMessage={onSaveMessage}
                                menuOpen={menuOpen}
                                setMenuOpen={setMenuOpen}
                                reactionPicker={reactionPicker}
                                setReactionPicker={setReactionPicker}
                            />
                        );
                    }}
                />
            )}
            {otherTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-20 left-4 z-20">
                    <div className="bg-white/50 dark:bg-white/10 rounded-full px-4 py-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default MessageList;

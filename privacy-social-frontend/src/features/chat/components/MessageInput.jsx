import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Loader from '../../../components/ui/Loader';
import { cn } from '../../../utils/cn';

const MessageInput = ({
    newMessage,
    setNewMessage,
    onSend,
    handleTyping,
    inputRef,
    fileInputRef,
    handleFileSelect,
    uploadFile,
    sendMessage,
    mediaAttachment,
    setMediaAttachment,
    reactionPicker,
    setReactionPicker
}) => {
    return (
        <div className="p-4 md:p-5 bg-surface/60 backdrop-blur-sm border-t border-border/30 z-20">
            {/* Privacy Banner */}
            <div className="flex justify-center mb-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface/40 rounded-full border border-border/20 backdrop-blur-md">
                    <span className="text-[10px] text-text-tertiary font-medium flex items-center gap-1">
                        🔒 Messages are private. Exact location & activity are never shared.
                    </span>
                </div>
            </div>

            <form onSubmit={onSend} className="max-w-4xl mx-auto flex items-end gap-2 text-left">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,application/pdf"
                />
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full w-10 h-10 p-0 text-text-secondary hover:text-primary-500 hover:bg-primary-500/10 flex-shrink-0"
                    title="Attach file"
                    disabled={uploadFile.isPending}
                >
                    {uploadFile.isPending ? (
                        <Loader size="sm" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                    )}
                </Button>

                <div className="flex-1 bg-surface/50 border border-border/30 focus-within:border-primary-500/50 focus-within:bg-surface/80 rounded-3xl transition-all shadow-inner relative flex flex-col justify-center">
                    {mediaAttachment && (
                        <div className="p-3 pb-0 relative w-fit">
                            <div className="relative group">
                                {mediaAttachment.type === 'image' && mediaAttachment.url ? (
                                    <img
                                        src={mediaAttachment.url}
                                        alt="Attachment"
                                        className="h-20 w-auto object-cover rounded-lg border border-white/10"
                                    />
                                ) : mediaAttachment.type === 'video' && mediaAttachment.url ? (
                                    <video
                                        src={mediaAttachment.url}
                                        className="h-20 w-auto object-cover rounded-lg border border-white/10"
                                        muted
                                    />
                                ) : (
                                    <div className="h-20 w-32 flex flex-col items-center justify-center bg-white/10 rounded-lg border border-white/10 gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-text-secondary">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                        <span className="text-xs truncate max-w-[100px] px-2">{mediaAttachment.name || 'File'}</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setMediaAttachment(null)}
                                    className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-text-secondary hover:text-red-500 shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                    <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder={mediaAttachment ? "Add a caption... ✍️" : "Type a message... ✨"}
                        className="border-none bg-transparent focus:bg-transparent px-4 py-3 h-auto max-h-32 min-h-[48px] resize-none pr-12 text-sm md:text-base"
                    />
                    <div className="absolute right-2 bottom-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                "text-text-tertiary hover:text-yellow-500 rounded-full w-8 h-8 p-0 transition-colors",
                                reactionPicker === 'input' && "text-yellow-500 bg-yellow-500/10"
                            )}
                            onClick={() => setReactionPicker(reactionPicker === 'input' ? null : 'input')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                            </svg>
                        </Button>
                        <AnimatePresence>
                            {reactionPicker === 'input' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-4 z-50 origin-bottom-right"
                                >
                                    <div className="shadow-2xl rounded-2xl overflow-hidden border border-border/50">
                                        <EmojiPicker
                                            theme="dark"
                                            searchDisabled={false}
                                            skinTonesDisabled
                                            width={320}
                                            height={400}
                                            lazyLoadEmojis={true}
                                            previewConfig={{ showPreview: false }}
                                            onEmojiClick={(emojiData) => {
                                                setNewMessage(prev => prev + emojiData.emoji);
                                                // Don't close picker to allow multiple selections
                                                inputRef.current?.focus();
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={(!newMessage.trim() && !mediaAttachment) || sendMessage.isPending || uploadFile.isPending}
                    className={cn(
                        "rounded-full w-12 h-12 p-0 flex items-center justify-center transition-all shadow-lg shadow-primary-500/25 flex-shrink-0",
                        (!newMessage.trim() && !mediaAttachment) ? "opacity-50 scale-90" : "scale-100 hover:scale-110"
                    )}
                >
                    {sendMessage.isPending ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </motion.div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 translate-x-0.5 translate-y-px">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    )}
                </Button>
            </form>
        </div>
    );
};

export default MessageInput;

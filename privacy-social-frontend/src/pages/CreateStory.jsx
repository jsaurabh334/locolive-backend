import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateStory } from '../features/feed/useFeed';
import apiService from '../api/client';
import { useLocation } from '../context/LocationContext';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

const CreateStory = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const { mutate: createStory, isPending } = useCreateStory();
    const { location, error } = useLocation();
    const toast = useToast();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setUploadError(null);
        }
    };

    const handleSubmit = async () => {
        if (!file || !location) {
            toast.error("Please select a file and allow location access");
            return;
        }

        try {
            setIsUploading(true);
            setUploadError(null);

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await apiService.uploadFile(formData);
            const mediaUrl = uploadResponse.data.url;

            if (!mediaUrl) {
                throw new Error("Failed to get media URL from upload");
            }

            const storyData = {
                media_url: mediaUrl,
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                latitude: parseFloat(location.lat),
                longitude: parseFloat(location.lng),
                caption: caption,
                is_anonymous: false
            };

            createStory(storyData, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['feed'] });
                    queryClient.invalidateQueries({ queryKey: ['map-clusters'] });
                    toast.success("Story posted successfully!");
                    navigate('/');
                },
                onError: (err) => {
                    console.error("Story creation error:", err);
                    setUploadError("Failed to post story. Please try again.");
                    toast.error("Failed to post story.");
                    setIsUploading(false);
                },
                onSettled: () => {
                    // Only stop loading if we didn't succeed (success handles its own nav)
                }
            });
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError("Failed to upload media. Please try again.");
            toast.error("Failed to upload media.");
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background pb-24">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-xl bg-background/80 border-b border-border/30 z-30">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Button variant="ghost" className="text-text-secondary" onClick={() => navigate(-1)}>
                        Cancel
                    </Button>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                                <span className="text-lg">📸</span>
                            </div>
                            <h2 className="text-lg font-bold text-text-primary">New Story</h2>
                        </div>
                        {uploadError && <span className="text-xs text-red-500 font-medium">{uploadError}</span>}
                    </div>
                    <Button
                        variant="primary"
                        disabled={!file || isPending || isUploading || !location}
                        isLoading={isPending || isUploading}
                        onClick={handleSubmit}
                        size="sm"
                    >
                        {error ? 'Location Error' : !location ? 'Locating...' : 'Post'}
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {preview ? (
                    <div className="relative w-full aspect-[4/5] bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden shadow-xl group">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        <button
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[4/5] border-2 border-dashed border-border/50 hover:border-primary-500/50 bg-surface/40 backdrop-blur-sm cursor-pointer flex flex-col items-center justify-center transition-all rounded-3xl hover:bg-surface/60 shadow-xl"
                    >
                        <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mb-4 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-text-primary font-semibold mb-1">Tap to select photo</span>
                        <span className="text-text-tertiary text-sm">Share your moment</span>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                />

                <div className="w-full">
                    <textarea
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 resize-none min-h-[120px] shadow-xl transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateStory;

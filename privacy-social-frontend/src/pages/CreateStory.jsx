import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateStory } from '../features/feed/useFeed';
import apiService from '../api/client';
import { useLocation } from '../context/LocationContext';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import FilterTools from '../features/story/FilterTools';

const CreateStory = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [filter, setFilter] = useState('');
    const [address, setAddress] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [showLocation, setShowLocation] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const { mutate: createStory, isPending } = useCreateStory();
    const { location, error } = useLocation();
    const toast = useToast();

    const EMOJIS = ['😊', '🔥', '✨', '📸', '📍', '🌊', '🌈', '🌟', '💎', '🎉'];


    // Reverse Geocoding for address display
    useEffect(() => {
        const hasCoords = (location?.lat !== undefined && location?.lat !== null) &&
            (location?.lng !== undefined && location?.lng !== null);

        if (hasCoords) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    const addr = data?.address || {};
                    // Generalized address components only
                    const parts = [];
                    if (addr.suburb) parts.push(addr.suburb);
                    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                    if (parts.length === 0 && addr.state) parts.push(addr.state);

                    const displayAddr = parts.slice(0, 2).join(', ') || 'Nearby';
                    setAddress(displayAddr);
                })
                .catch(err => {
                    console.error('Geocoding failed:', err);
                    setAddress('Nearby');
                });
        }
    }, [location]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setUploadError(null);
            setFilter(''); // Reset filter on new file
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const selectedFile = e.dataTransfer.files[0];
        if (selectedFile && (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/'))) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setUploadError(null);
            setFilter('');
        } else {
            toast.error("Please drop an image or video file");
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
                is_anonymous: isAnonymous,
                show_location: showLocation,
                filter: filter
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
                {error && (
                    <div className="max-w-4xl mx-auto px-6 pb-2">
                        <p className="text-xs text-red-500 text-center font-medium bg-red-500/10 py-1 rounded-lg border border-red-500/20">
                            Location Error: {error.message || "Unknown error"}
                            {error.code === 1 && " (Permission Denied)"}
                            {error.code === 2 && " (Position Unavailable)"}
                            {error.code === 3 && " (Timeout)"}
                        </p>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {preview ? (
                    <div className="space-y-6 animate-fade-in group/main">
                        <div className="relative w-full aspect-[4/5] bg-neutral-900 rounded-[40px] overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10">
                            {/* Blurred Background Fill */}
                            <div className="absolute inset-0 scale-110 blur-3xl opacity-50 select-none pointer-events-none">
                                {file?.type.startsWith('video/') ? (
                                    <video src={preview} x-webkit-airplay="deny" className="w-full h-full object-cover" />
                                ) : (
                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>

                            {/* Main Media Preview */}
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                {file?.type.startsWith('video/') ? (
                                    <video
                                        src={preview}
                                        controls
                                        className="max-w-full max-h-full rounded-2xl shadow-2xl transition-all duration-500"
                                        style={{ filter: filter }}
                                    />
                                ) : (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="max-w-full max-h-full rounded-2xl shadow-2xl transition-all duration-500"
                                        style={{ filter: filter }}
                                    />
                                )}
                            </div>

                            {/* Location Overlay Info */}
                            {showLocation && !isAnonymous && (
                                <div className="absolute bottom-6 left-6 z-10 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg animate-fade-in transition-transform group-hover/main:scale-105">
                                    <span className="text-lg">📍</span>
                                    <span className="text-white text-sm font-medium">{address || 'Locating...'}</span>
                                </div>
                            )}

                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-6 right-6 bg-black/50 hover:bg-red-500 text-white rounded-full p-2.5 opacity-0 group-hover/main:opacity-100 transition-all shadow-lg backdrop-blur-md border border-white/10 hover:scale-110 active:scale-95 z-20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Story Tools */}
                        <div className="bg-surface/40 backdrop-blur-sm border border-border/30 rounded-3xl p-6 shadow-xl space-y-6">
                            <FilterTools selectedFilter={filter} onSelectFilter={setFilter} />

                            <div className="h-px bg-border/20" />

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-text-primary">Post Anonymously</span>
                                    <span className="text-xs text-text-tertiary">Your identity will be hidden</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newVal = !isAnonymous;
                                        setIsAnonymous(newVal);
                                        if (newVal) setShowLocation(false);
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isAnonymous ? 'bg-primary-500' : 'bg-neutral-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isAnonymous ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="h-px bg-border/10" />

                            <div className={`flex items-center justify-between transition-opacity duration-300 ${isAnonymous ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-text-primary">Show Location Text</span>
                                    <span className="text-xs text-text-tertiary">Show "{address || 'Nearby'}" on your story</span>
                                </div>
                                <button
                                    onClick={() => !isAnonymous && setShowLocation(!showLocation)}
                                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${showLocation ? 'bg-primary-500' : 'bg-neutral-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${showLocation ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full aspect-[4/5] md:aspect-[16/10] border-2 border-dashed transition-all rounded-[40px] flex flex-col items-center justify-center gap-6 bg-surface/30 backdrop-blur-md shadow-xl p-12 text-center group cursor-pointer ${isDragging ? 'border-primary-500 bg-primary-500/5' : 'border-border/50 hover:border-primary-500/50 hover:bg-surface/50'
                            }`}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative p-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[32px] shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
                                Create Your Story
                            </h3>
                            <p className="text-text-tertiary text-lg">
                                Drag and drop or tap to upload media
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <span className="px-4 py-1.5 bg-surface-elevated border border-border/50 rounded-full text-xs font-medium text-text-tertiary shadow-sm">JPG / PNG</span>
                            <span className="px-4 py-1.5 bg-surface-elevated border border-border/50 rounded-full text-xs font-medium text-text-tertiary shadow-sm">MP4</span>
                        </div>
                    </div>
                )}

                <div className="relative group">
                    <textarea
                        placeholder="What's on your mind?..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-surface/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 resize-none min-h-[140px] shadow-xl transition-all text-lg"
                    />

                    {/* Emoji Preset Buttons */}
                    <div className="absolute bottom-4 right-4 flex gap-1.5 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setCaption(prev => prev + emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default CreateStory;

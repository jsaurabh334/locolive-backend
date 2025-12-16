import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateStory } from '../features/feed/useFeed';
import apiService from '../api/client';
import { useLocation } from '../context/LocationContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';

const CreateStory = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { mutate: createStory, isPending } = useCreateStory();
    const { location } = useLocation();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async () => {
        if (!file || !location) return;

        try {
            setIsUploading(true);
            // 1. Upload file
            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await apiService.uploadFile(formData);
            const mediaUrl = uploadResponse.data.url;

            // 2. Create Story
            createStory({
                media_url: mediaUrl,
                media_type: 'image',
                latitude: location.lat,
                longitude: location.lng,
                caption: caption,
                is_anonymous: false
            }, {
                onSuccess: () => {
                    // Invalidate feed and map queries to show new story
                    queryClient.invalidateQueries({ queryKey: ['feed'] });
                    queryClient.invalidateQueries({ queryKey: ['map-clusters'] });
                    navigate('/');
                },
                onSettled: () => {
                    setIsUploading(false);
                }
            });
        } catch (error) {
            console.error("Failed to create story:", error);
            alert("Failed to create story. Please try again.");
            setIsUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col pb-safe">
            {/* Custom Header for Create Story */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50 backdrop-blur top-0 sticky z-30">
                <Button variant="ghost" className="text-text-secondary" onClick={() => navigate(-1)}>
                    Cancel
                </Button>
                <h2 className="font-bold text-lg text-text-primary">New Story</h2>
                <Button
                    variant="primary"
                    disabled={!file || isPending || isUploading || !location}
                    isLoading={isPending || isUploading}
                    onClick={handleSubmit}
                    size="sm"
                >
                    {!location ? 'Locating...' : 'Post'}
                </Button>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                {preview ? (
                    <Card className="relative w-full aspect-[4/5] bg-black p-0 border-0 group" noPadding>
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        <button
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </Card>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[4/5] border-2 border-dashed border-border hover:border-text-secondary bg-surface/30 cursor-pointer flex flex-col items-center justify-center transition-colors rounded-xl"
                    >
                        <div className="p-4 bg-surface rounded-full mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-text-secondary font-medium">Tap to select photo</span>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

                <div className="w-full">
                    <textarea
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl p-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none min-h-[100px]"
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateStory;

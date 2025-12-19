import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService, { getMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ArchivedStories() {
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        loadArchives();
    }, [page]);

    const loadArchives = async () => {
        try {
            setLoading(true);
            const response = await apiService.getArchivedStories(page, 20);
            setArchives(response.data.archives || []);
            setTotalPages(response.data.total_pages || 1);
        } catch (error) {
            console.error('Failed to load archives:', error);
            setError('Failed to load archived stories');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this archived story? This action cannot be undone.')) return;

        try {
            await apiService.deleteArchivedStory(id);
            setArchives(archives.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete:', error);
            setError('Failed to delete archived story');
        }
    };

    const handleView = (archive) => {
        // Navigate to view story with archive data
        navigate(`/view-story/${archive.story_id}`, {
            state: {
                stories: [archive],
                initialIndex: 0
            }
        });
    };

    if (loading && archives.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Archived Stories</h1>
                        </div>
                        <div className="text-sm text-gray-500">
                            {archives.length} {archives.length === 1 ? 'story' : 'stories'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                </div>
            )}

            {/* Archives Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {archives.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No archived stories</h3>
                        <p className="mt-1 text-sm text-gray-500">Archive your favorite stories to save them permanently.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {archives.map(archive => (
                            <div key={archive.id} className="group relative bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                                {/* Thumbnail */}
                                <div
                                    className="aspect-[3/4] bg-gray-200 cursor-pointer"
                                    onClick={() => handleView(archive)}
                                >
                                    <img
                                        src={getMediaUrl(archive.media_url)}
                                        alt={archive.caption || 'Archived story'}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                    {archive.caption && (
                                        <p className="text-white text-sm line-clamp-2 mb-1">
                                            {archive.caption}
                                        </p>
                                    )}
                                    <p className="text-white/70 text-xs">
                                        {new Date(archive.original_created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDelete(archive.id)}
                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600/70 rounded-full opacity-0 group-hover:opacity-100 transition"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-white border border-gray-300 rounded-md">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

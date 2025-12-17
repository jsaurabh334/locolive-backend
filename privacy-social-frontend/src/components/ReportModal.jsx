import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../api/client';
import Button from './ui/Button';
import Card from './ui/Card';

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetName }) => {
    const [category, setCategory] = useState('');
    const [details, setDetails] = useState('');

    const reportMutation = useMutation({
        mutationFn: (data) => apiClient.createReport(data),
        onSuccess: () => {
            alert('Report submitted successfully. Thank you for helping keep our community safe.');
            onClose();
            setCategory('');
            setDetails('');
        },
        onError: (error) => {
            alert(error.response?.data?.error || 'Failed to submit report. Please try again.');
        }
    });

    const handleSubmit = () => {
        if (!category) {
            alert('Please select a report category');
            return;
        }

        reportMutation.mutate({
            reported_type: targetType, // 'user' or 'story'
            reported_id: targetId,
            reason: category,
            details: details || undefined
        });
    };

    if (!isOpen) return null;

    const categories = [
        { value: 'spam', label: '🚫 Spam', desc: 'Repetitive or unwanted content' },
        { value: 'harassment', label: '⚠️ Harassment', desc: 'Bullying or threatening behavior' },
        { value: 'inappropriate', label: '🔞 Inappropriate Content', desc: 'Offensive or explicit material' },
        { value: 'fake_gps', label: '📍 Fake GPS', desc: 'Location spoofing or manipulation' },
        { value: 'impersonation', label: '👤 Impersonation', desc: 'Pretending to be someone else' },
        { value: 'other', label: '❓ Other', desc: 'Something else' }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-text-primary">Report {targetType === 'user' ? 'User' : 'Story'}</h3>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-text-secondary">
                    Reporting <span className="font-semibold text-text-primary">{targetName}</span>
                </p>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Why are you reporting this?
                    </label>
                    {categories.map((cat) => (
                        <label
                            key={cat.value}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${category === cat.value
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-border hover:border-primary-500/50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="category"
                                value={cat.value}
                                checked={category === cat.value}
                                onChange={(e) => setCategory(e.target.value)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-text-primary">{cat.label}</div>
                                <div className="text-xs text-text-secondary">{cat.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Additional Details (Optional)
                    </label>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Provide any additional context..."
                        maxLength={500}
                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-24"
                    />
                    <p className="text-xs text-text-tertiary mt-1">{details.length}/500 characters</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={reportMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={reportMutation.isPending}
                        disabled={!category}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        Submit Report
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default ReportModal;

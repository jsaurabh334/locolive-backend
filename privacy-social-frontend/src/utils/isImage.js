export const isImage = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Check if it's a data URL
    if (url.startsWith('data:image')) return true;

    // If it contains spaces, it's text message, not just a URL
    if (/\s/.test(url.trim())) return false;

    // Check for common image extensions
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(url);
};

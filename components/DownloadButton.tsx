import React from 'react';

interface DownloadButtonProps {
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  className?: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ mediaUrl, mediaType, className }) => {

  const handleDownload = () => {
    if (!mediaUrl) return;

    const link = document.createElement('a');
    link.href = mediaUrl;

    let extension = 'file';
    if (mediaType === 'image') {
        if (mediaUrl.startsWith('data:image/png')) {
            extension = 'png';
        } else {
            extension = 'jpeg';
        }
    } else if (mediaType === 'video') {
        extension = 'mp4';
    }

    link.download = `toolq-conten-${mediaType}-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!mediaUrl}
      aria-label="Download media"
      className={`absolute bg-surface hover:bg-border border border-border text-text-secondary font-bold py-1 px-3 rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      Download
    </button>
  );
};

export default DownloadButton;
import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string | null;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, className }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy || isCopied}
      aria-label="Copy to clipboard"
      className={`absolute top-2 right-2 bg-surface hover:bg-border border border-border text-text-secondary font-bold py-1 px-3 rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default CopyButton;
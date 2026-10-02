import React, { useState } from 'react';
import { Headphones, Loader2 } from 'lucide-react';

const PodcastButton = ({ 
  onClick, 
  currentDocument, 
  selectedSection, 
  recommendations = [],
  currentSessionId = null,
  selectedText = '', 
  relatedSections = [],
  isVisible = true,
  isGenerating = false,
  setIsGenerating
}) => {
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  
  // Use parent-controlled state if available, otherwise use local state
  const generating = isGenerating !== undefined ? isGenerating : localIsGenerating;
  const setGenerating = setIsGenerating || setLocalIsGenerating;

  const handlePodcastClick = () => {
    // Check if we have content to generate podcast from
    if (!selectedText && !selectedSection && !currentDocument && (!recommendations || recommendations.length === 0)) {
      alert('Please select text or upload documents first to generate a podcast.');
      return;
    }

    // Immediately set loading state to show user feedback
    setGenerating(true);

    // Call the parent onClick handler
    if (onClick) {
      onClick();
    }
  };

  // Determine button state and text
  const hasContent = selectedText || recommendations.length > 0 || selectedSection || currentDocument;
  const buttonText = selectedText
    ? 'Generate Podcast (Selected Text)'
    : recommendations.length > 0 
      ? `Generate Podcast (${recommendations.length} sections)`
      : selectedSection 
        ? 'Generate Podcast (Current Section)' 
        : currentDocument 
          ? 'Generate Podcast (Document)' 
          : 'Select Content First';

  if (!isVisible) return null;

  return (
    <>
      <button 
        id="podcast-button"
        onClick={handlePodcastClick}
        disabled={!hasContent || generating}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${
          !hasContent || generating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
        }`}
        title={!hasContent ? 'Select content to generate podcast' : generating ? 'Generating podcast...' : buttonText}
      >
        <div className="flex items-center justify-center">
          {generating ? (
            <Loader2 className="w-7 h-7 animate-spin text-white" />
          ) : (
            <span className="text-3xl">🎧</span>
          )}
          {currentSessionId && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white">✨</span>
            </span>
          )}
        </div>
      </button>
    </>
  );
};

export default PodcastButton;

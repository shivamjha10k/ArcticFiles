import React, { useState } from 'react';
import { Headphones } from 'lucide-react';
import PodcastGenerator from './PodcastGenerator';

const PodcastButtonWithModal = ({ 
  currentDocument, 
  selectedSection, 
  userProfile, 
  currentProfile, 
  recommendations = [],
  currentSessionId = null,
  selectedText = '', 
  relatedSections = [] 
}) => {
  const [showPodcastGenerator, setShowPodcastGenerator] = useState(false);

  const handlePodcastClick = () => {
    // Check if we have profile information (either from currentProfile or userProfile)
    const hasProfile = currentProfile?.persona && currentProfile?.job_description || 
                      userProfile?.role && userProfile?.task;
    
    if (!hasProfile) {
      alert('Please complete your profile first. Go to Settings to create or select a profile.');
      return;
    }

    // Check if we have content to generate podcast from
    if (!selectedText && !selectedSection && !currentDocument && (!recommendations || recommendations.length === 0)) {
      alert('Please select text or upload documents first to generate a podcast.');
      return;
    }

    // Show the podcast generator modal
    setShowPodcastGenerator(true);
  };

  const handleClosePodcastGenerator = () => {
    setShowPodcastGenerator(false);
  };

  // Prepare content for podcast generation
  const getPodcastContent = () => {
    // Priority order: selectedText > selectedSection > recommendations > currentDocument
    if (selectedText) {
      return {
        text: selectedText,
        sections: relatedSections || []
      };
    } else if (selectedSection) {
      return {
        text: selectedSection.text || selectedSection.content || 'Selected section content',
        sections: relatedSections || []
      };
    } else if (recommendations && recommendations.length > 0) {
      const recommendationText = recommendations.map(r => r.text || r.content).join(' ').substring(0, 1000);
      return {
        text: recommendationText,
        sections: recommendations
      };
    } else if (currentDocument) {
      return {
        text: currentDocument.title || currentDocument.name || 'Current document',
        sections: []
      };
    }
    return { text: '', sections: [] };
  };

  const podcastContent = getPodcastContent();

  return (
    <>
      <button
        onClick={handlePodcastClick}
        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        title="Generate AI Podcast"
      >
        <Headphones size={18} />
        <span>🎧 Generate Podcast</span>
      </button>

      {showPodcastGenerator && (
        <PodcastGenerator
          selectedText={podcastContent.text}
          relatedSections={podcastContent.sections}
          currentDocument={currentDocument}
          onClose={handleClosePodcastGenerator}
        />
      )}
    </>
  );
};

export default PodcastButtonWithModal;

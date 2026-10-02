import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Download, Loader2 } from 'lucide-react';

const CompactPodcastPlayer = ({ 
  selectedText, 
  relatedSections, 
  currentDocument, 
  onClose,
  isVisible = true 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const playbackSpeeds = [0.5, 1, 1.5, 2];

  useEffect(() => {
    // Auto-generate podcast when component mounts
    if (selectedText || currentDocument) {
      generatePodcast();
    }
  }, []);

  const generatePodcast = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🎧 Generating podcast with ElevenLabs...');
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const requestBody = {
        selected_text: selectedText || currentDocument?.name || 'Document content',
        fileId: currentDocument?.path || currentDocument?.filepath || null,
        related_sections: relatedSections || [],
        audio_type: 'overview', // Default to overview for compact player
        duration_minutes: 3 // Default 3 minutes for compact player
      };

      const response = await fetch(`${API_URL}/api/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the audio blob from the response
      const audioBlob = await response.blob();
      const audioObjectUrl = URL.createObjectURL(audioBlob);
      
      setAudioUrl(audioObjectUrl);
      console.log('✅ Podcast generated successfully with ElevenLabs TTS');
      
    } catch (err) {
      console.error('❌ Podcast generation error:', err);
      let errorMessage = 'Failed to generate podcast. ';
      
      if (err.message.includes('API key')) {
        errorMessage += 'Please check ElevenLabs API configuration.';
      } else if (err.message.includes('quota') || err.message.includes('limit')) {
        errorMessage += 'API quota exceeded. Please try again later.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipTime = (seconds) => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `podcast_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Compact Player */}
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-gray-700 backdrop-blur-sm">
        {/* Header */}
        <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-sm">🎧</span>
            </div>
            <span className="text-sm font-medium">AI Podcast</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 w-80">
          {isGenerating ? (
            /* Loading State */
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Generating podcast...</p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="text-center py-4">
              <p className="text-red-400 text-sm mb-3">❌ {error}</p>
              <button
                onClick={generatePodcast}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Player Controls */
            <div className="space-y-3 relative">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div 
                  className="w-full h-1 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex flex-col items-center space-y-3">
                {/* Play/Skip Controls - Centered */}
                <div className="flex items-center justify-center gap-2">
                  {/* Skip Backward */}
                  <button
                    onClick={() => skipTime(-15)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    title="Skip back 15s"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
                    disabled={!audioUrl}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    )}
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => skipTime(15)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    title="Skip forward 15s"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Speed Controls - Below play controls */}
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs text-gray-500 mr-2">Speed:</span>
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackRate(speed);
                        if (audioRef.current) {
                          audioRef.current.playbackRate = speed;
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors min-w-[35px] ${
                        playbackRate === speed
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Button - Top Right */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={downloadAudio}
                  className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                  title="Download"
                  disabled={!audioUrl}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Content Info */}
              <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-2">
                {selectedText ? (
                  <p>📝 Selected text ({selectedText.length} chars)</p>
                ) : currentDocument ? (
                  <p>📄 {currentDocument.name || 'Document'}</p>
                ) : (
                  <p>🎧 AI-generated podcast</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactPodcastPlayer;

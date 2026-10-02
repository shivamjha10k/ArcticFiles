import React, { useState } from 'react';
import { X, Play, Download, Settings, Loader2, Volume2, VolumeX } from 'lucide-react';

const PodcastGenerator = ({ selectedText, relatedSections, onClose, currentDocument }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [podcastType, setPodcastType] = useState('podcast');
  const [duration, setDuration] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [podcastScript, setPodcastScript] = useState('');

  const generatePodcast = async () => {
    if (!selectedText && !currentDocument) {
      setError('Please select text or upload documents first to generate a meaningful podcast.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      console.log('🎧 Generating podcast with ElevenLabs...');
      
      // Use the backend API endpoint
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const requestBody = {
        selected_text: selectedText || currentDocument?.name || 'Document content',
        fileId: currentDocument?.path || currentDocument?.filepath || null,
        related_sections: relatedSections || [],
        audio_type: podcastType,
        duration_minutes: duration
      };

      console.log('📡 Sending request to backend:', requestBody);

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

      // Check if this is a fallback response
      const fallback = response.headers.get('X-Podcast-Fallback') === 'true';
      const scriptBase64 = response.headers.get('X-Podcast-Script');
      
      setIsFallback(fallback);
      
      if (scriptBase64) {
        try {
          const decodedScript = atob(scriptBase64);
          setPodcastScript(decodedScript);
        } catch (e) {
          console.warn('Could not decode podcast script from headers');
        }
      }

      // Get the audio blob from the response (even if it's fallback audio)
      const audioBlob = await response.blob();
      const audioObjectUrl = URL.createObjectURL(audioBlob);
      
      setAudioUrl(audioObjectUrl);
      
      if (fallback) {
        console.log('✅ Podcast generated with fallback audio (ElevenLabs unavailable)');
      } else {
        console.log('✅ Podcast generated successfully with ElevenLabs TTS');
      }
      
    } catch (err) {
      console.error('❌ Podcast generation error:', err);
      let errorMessage = 'Podcast generation failed. ';
      
      if (err.message.includes('API key')) {
        errorMessage += 'Please check your ElevenLabs API configuration.';
      } else if (err.message.includes('quota') || err.message.includes('limit')) {
        errorMessage += 'API quota exceeded. Please try again later.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage += 'Network connection failed. Please check your internet connection.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
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

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAudioLoad = (e) => {
    setTotalDuration(e.target.duration);
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    const audio = document.getElementById('podcast-audio');
    if (audio) {
      audio.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const audio = document.getElementById('podcast-audio');
    if (audio) {
      if (isMuted) {
        audio.volume = volume;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Podcast Generator</h2>
                <p className="text-purple-100 text-sm">Create an AI-powered audio overview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Content Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-lg">📄</span>
              Selected Content:
            </h3>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto border">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {selectedText ? 
                  selectedText.substring(0, 300) + (selectedText.length > 300 ? '...' : '') : 
                  currentDocument?.name || 'No content selected'
                }
              </p>
            </div>
            {relatedSections && relatedSections.length > 0 && (
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                <span className="text-base">📚</span>
                Found {relatedSections.length} related sections to include
              </p>
            )}
          </div>

          {/* Podcast Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Podcast Settings
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Podcast Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Style:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      value="podcast"
                      checked={podcastType === 'podcast'}
                      onChange={(e) => setPodcastType(e.target.value)}
                      className="mr-3 text-purple-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎙️</span>
                        <span className="font-medium text-gray-900 dark:text-white">Conversation</span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Two-host discussion</span>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      value="overview"
                      checked={podcastType === 'overview'}
                      onChange={(e) => setPodcastType(e.target.value)}
                      className="mr-3 text-purple-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📢</span>
                        <span className="font-medium text-gray-900 dark:text-white">Overview</span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Single narrator summary</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duration: {duration} minutes
                </label>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>2 min</span>
                    <span>5 min</span>
                    <span>8 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generatePodcast}
            disabled={isGenerating || (!selectedText && !currentDocument)}
            className={`w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 ${
              isGenerating || (!selectedText && !currentDocument)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Podcast...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🎧</span>
                <span>Generate {podcastType === 'podcast' ? 'Podcast Conversation' : 'Audio Overview'}</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-lg">❌</span>
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">Generation Failed</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Podcast Script Display (for fallback mode) */}
          {podcastScript && isFallback && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📜</span>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Podcast Script Generated</h3>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">Audio generation unavailable - showing script instead</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto border">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {podcastScript}
                </p>
              </div>
              
              <div className="mt-4 text-xs text-yellow-600 dark:text-yellow-400">
                💡 To enable audio generation, configure ElevenLabs API in the backend settings.
              </div>
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🎵</span>
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Your Podcast is Ready!</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">High-quality AI-generated audio overview</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Custom Audio Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <audio
                    id="podcast-audio"
                    src={audioUrl}
                    onLoadedMetadata={handleAudioLoad}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="hidden"
                  />
                  
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalDuration ? (currentTime / totalDuration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const audio = document.getElementById('podcast-audio');
                          if (audio) {
                            if (isPlaying) {
                              audio.pause();
                            } else {
                              audio.play();
                            }
                          }
                        }}
                        className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                      >
                        {isPlaying ? (
                          <div className="w-3 h-3 bg-white rounded-sm" />
                        ) : (
                          <Play className="w-5 h-5 ml-1" fill="white" />
                        )}
                      </button>
                      
                      {/* Volume control */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={downloadAudio}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-lg">💡</span>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h4>
                <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                  <li>• Analyzes your selected text and related content across documents</li>
                  <li>• Generates comprehensive insights using advanced AI analysis</li>
                  <li>• Creates natural-sounding podcast with professional narration</li>
                  <li>• Uses high-quality text-to-speech for clear audio generation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PodcastGenerator;

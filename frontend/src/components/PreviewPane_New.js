import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import FileViewer from './FileViewer';

const PreviewPane = ({ activeTab, onTabSwitch, selectedFile, aiSummary, aiSummaryFile }) => {
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const { askAI } = useSearch();

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    
    setIsAskingAI(true);
    try {
      // Pass the selected file path for file-specific questions
      const fileId = selectedFile ? selectedFile.path : null;
      const result = await askAI(aiQuestion, 5, fileId);
      
      if (result.success) {
        setAiResponse(result.answer || result.summary);
      } else {
        setAiResponse(`Error: ${result.error}`);
      }
    } catch (err) {
      setAiResponse('Failed to get AI response. Please try again.');
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <aside className="w-[550px] glass flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button 
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 tab-button ${
            activeTab === 'preview' ? 'active' : ''
          }`}
          onClick={() => onTabSwitch('preview')}
        >
          Preview
        </button>
        <button 
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 tab-button ${
            activeTab === 'insight' ? 'active' : ''
          }`}
          onClick={() => onTabSwitch('insight')}
        >
          AI Insight
        </button>
      </div>

      {/* Preview Tab Content */}
      {activeTab === 'preview' && (
        <div className="flex-1 overflow-hidden">
          <FileViewer 
            selectedFile={selectedFile}
            onError={(error) => console.error('File viewer error:', error)}
          />
        </div>
      )}

      {/* AI Insight Tab Content */}
      {activeTab === 'insight' && (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="glass rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                <Brain className="w-4 h-4 mr-2 text-neon-500 dark:text-cyber-400 animate-pulse" />
                AI Summary
                {aiSummaryFile && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({aiSummaryFile})
                  </span>
                )}
              </h3>
              {aiSummary ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {aiSummary}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Click "Summarize" on any file to see AI-generated insights here.
                </p>
              )}
            </div>

            <div className="glass rounded-lg p-4">
              <h4 className="font-medium text-gray-800 dark:text-white mb-2">Key Concepts</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-neon-500 animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Backpropagation Algorithm</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyber-500 animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Gradient Descent Optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-electric-500 animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Batch Normalization</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-lg p-4">
              <h4 className="font-medium text-gray-800 dark:text-white mb-3">Ask AI</h4>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Ask about this file..." 
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAskingAI && handleAskAI()}
                  className="w-full px-3 py-2 rounded-lg glass neon-border text-sm text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-500/50 dark:focus:ring-cyber-500/50 animate-neon-pulse"
                />
                <button 
                  onClick={handleAskAI}
                  disabled={isAskingAI || !aiQuestion.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-neon-500 to-cyber-500 text-white text-sm font-medium hover:from-neon-600 hover:to-cyber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 animate-pulse-glow"
                >
                  {isAskingAI ? 'Asking AI...' : 'Ask AI'}
                </button>
                
                {/* AI Response */}
                {aiResponse && (
                  <div className="mt-4 p-3 rounded-lg glass">
                    <h5 className="font-medium text-gray-800 dark:text-white mb-2">AI Response:</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {aiResponse}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default PreviewPane;

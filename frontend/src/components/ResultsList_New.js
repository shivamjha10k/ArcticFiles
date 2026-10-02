import React, { useState } from 'react';
import { FileCode, FileText, Database, Filter, Eye, Download, Share, Trash, Loader, Search, RefreshCw, Plus, Sparkles, Brain } from 'lucide-react';
import { useFileOperations } from '../hooks/useFileOperations';
import { useSearch } from '../hooks/useSearch';

const ResultsList = ({ results = [], query, isSearching, onResultSelect, onSummaryGenerated }) => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState({});
  const { indexFile, reindexFile, removeFile, isProcessing } = useFileOperations();
  const { askAI } = useSearch();

  const getFileIcon = (type) => {
    switch (type) {
      case 'code':
        return FileCode;
      case 'document':
        return FileText;
      case 'data':
        return Database;
      default:
        return FileCode;
    }
  };

  const getFileColor = (type) => {
    switch (type) {
      case 'code':
        return 'from-neon-500 to-neon-600';
      case 'document':
        return 'from-cyber-500 to-cyber-600';
      case 'data':
        return 'from-electric-600 to-electric-700';
      default:
        return 'from-neon-500 to-neon-600';
    }
  };

  const getMatchColor = (matchPercentage) => {
    if (matchPercentage >= 95) return 'bg-neon-500/20 text-neon-700 dark:text-neon-400';
    if (matchPercentage >= 90) return 'bg-cyber-500/20 text-cyber-700 dark:text-cyber-400';
    return 'bg-electric-500/20 text-electric-700 dark:text-electric-400';
  };

  const showContextMenu = (cardId) => {
    setHoveredCard(cardId);
  };

  const hideContextMenu = () => {
    setHoveredCard(null);
  };

  const handleFileOperation = async (operation, filePath, fileName) => {
    let result;
    let actionName;

    switch (operation) {
      case 'reindex':
        result = await reindexFile(filePath);
        actionName = 'reindexed';
        break;
      case 'remove':
        if (window.confirm(`Are you sure you want to remove "${fileName}" from the index?`)) {
          result = await removeFile(filePath);
          actionName = 'removed';
        } else {
          return;
        }
        break;
      case 'index':
        result = await indexFile(filePath);
        actionName = 'indexed';
        break;
      default:
        console.error('Unknown file operation:', operation);
        return;
    }

    if (result && result.success) {
      // You might want to show a success message or refresh the results
      console.log(`File ${actionName} successfully`);
    } else {
      console.error(`Failed to ${operation} file:`, result?.error);
    }
  };

  const handleSummarize = async (filePath, fileName) => {
    const fileKey = filePath;
    setIsSummarizing(prev => ({ ...prev, [fileKey]: true }));
    
    try {
      const result = await askAI('Summarize this document', 5, filePath);
      
      if (result.success) {
        // Call the parent callback to set summary in AI Insights
        onSummaryGenerated && onSummaryGenerated(filePath, fileName, result.answer || result.summary);
      } else {
        console.error('Summary failed:', result.error);
      }
    } catch (error) {
      console.error('Summary error:', error);
    } finally {
      setIsSummarizing(prev => ({ ...prev, [fileKey]: false }));
    }
  };

  const sampleResults = [
    // Removed sample data - will only show real search results
  ];

  const displayResults = results.length > 0 ? results : [];

  // Show different content based on search state
  const showEmptyState = query && !isSearching && results.length === 0;
  const showSearching = isSearching;
  const showResults = !isSearching && results.length > 0;
  const showInitialState = !query && !isSearching && results.length === 0;

  return (
    <main className="w-[720px] glass border-r border-white/10 divider-glow flex flex-col">
      {/* Search Results Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {showSearching ? 'Searching...' :
             showResults ? 'Search Results' :
             showEmptyState ? 'No Results' :
             'Semantic Search'}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {showSearching ? 'Searching...' : 
               showResults ? `${displayResults.length} file${displayResults.length !== 1 ? 's' : ''} found` :
               showInitialState ? 'Ready to search' : 
               `No results for "${query}"`}
            </span>
            {!isSearching && showResults && (
              <button className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300">
                <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {showSearching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-neon-500 mx-auto mb-4" />
            <div className="glass rounded-lg p-4 max-w-md">
              <p className="text-gray-600 dark:text-gray-400 mb-2">Searching for "{query}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Analyzing semantic matches across your indexed files...</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="glass rounded-lg p-6 max-w-md">
              <p className="text-gray-600 dark:text-gray-400 mb-2">No results found for "{query}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Try refining your search or check if directories are being watched.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4" />
                <span>Tip: Use descriptive terms for better semantic matching</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initial State - No Search Query */}
      {showInitialState && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <Brain className="w-16 h-16 text-neon-500 mx-auto animate-pulse" />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-cyber-400 animate-bounce" />
              </div>
            </div>
            <div className="glass rounded-lg p-8 max-w-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Intelligent Semantic Search
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Search through your indexed files using natural language. Find documents by meaning, not just keywords.
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-500 dark:text-gray-500">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-neon-500" />
                  <span>Try: "machine learning algorithms"</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-cyber-400" />
                  <span>Try: "database optimization techniques"</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-electric-500" />
                  <span>Try: "authentication and security"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      {showResults && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{displayResults.map((result) => {
          const IconComponent = getFileIcon(result.type);
          return (
            <div 
              key={result.id}
              className="h-40 glass rounded-xl p-4 hover:bg-white/20 transition-colors duration-300 cursor-pointer relative group neon-border" 
              onMouseEnter={() => showContextMenu(result.id)} 
              onMouseLeave={hideContextMenu}
              onClick={() => onResultSelect && onResultSelect(result)}
            >
              <div className="flex items-start space-x-4 h-full">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getFileColor(result.type)} flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {result.filename}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchColor(result.match)} animate-pulse`}>
                      {result.match}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {result.filePath}
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      className="px-3 py-1 rounded-lg bg-neon-500/20 text-neon-700 dark:text-neon-400 text-xs font-medium hover:bg-neon-500/30 transition-all duration-300 hover:animate-pulse"
                      onClick={() => onResultSelect && onResultSelect(result)}
                    >
                      Open
                    </button>
                    <button 
                      className="px-3 py-1 rounded-lg bg-cyber-500/20 text-cyber-700 dark:text-cyber-400 text-xs font-medium hover:bg-cyber-500/30 transition-all duration-300 hover:animate-pulse"
                      onClick={() => handleSummarize(result.filePath, result.filename)}
                      disabled={isSummarizing[result.filePath]}
                    >
                      {isSummarizing[result.filePath] ? 'Summarizing...' : 'Summarize'}
                    </button>
                    <button className="px-3 py-1 rounded-lg bg-electric-500/20 text-electric-700 dark:text-electric-400 text-xs font-medium hover:bg-electric-500/30 transition-all duration-300 hover:animate-pulse">
                      Pin
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Context Menu */}
              <div className={`context-menu absolute top-4 right-4 w-32 h-32 rounded-full glass neon-border flex items-center justify-center ${
                hoveredCard === result.id ? 'active' : ''
              }`}>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className="w-8 h-8 rounded-full bg-neon-500/20 flex items-center justify-center hover:bg-neon-500/40 transition-all duration-300 hover:animate-pulse"
                    onClick={() => onResultSelect && onResultSelect(result)}
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4 text-neon-600 dark:text-neon-400" />
                  </button>
                  <button 
                    className="w-8 h-8 rounded-full bg-cyber-500/20 flex items-center justify-center hover:bg-cyber-500/40 transition-all duration-300 hover:animate-pulse"
                    onClick={() => handleSummarize(result.filePath, result.filename)}
                    disabled={isSummarizing[result.filePath]}
                    title="Summarize file"
                  >
                    <Brain className="w-4 h-4 text-cyber-600 dark:text-cyber-400" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-electric-500/20 flex items-center justify-center hover:bg-electric-500/40 transition-all duration-300 hover:animate-pulse">
                    <Share className="w-4 h-4 text-electric-600 dark:text-electric-400" />
                  </button>
                  <button 
                    className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-all duration-300 hover:animate-pulse"
                    onClick={() => handleFileOperation('remove', result.filePath, result.filename)}
                    disabled={isProcessing}
                    title="Remove from index"
                  >
                    <Trash className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </main>
  );
};

export default ResultsList;

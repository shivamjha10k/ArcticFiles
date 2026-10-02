import React, { useState } from 'react';
import { Folder, Code, FileText, Image, Brain, ChevronDown, AlertCircle, FolderPlus, FolderOpen, Trash2, CheckCircle, Loader } from 'lucide-react';
import { useDirectories } from '../hooks/useDirectories';

const Sidebar = ({ 
  coPilotActive, 
  onToggleCoPilot, 
  collapsedSections, 
  onToggleSection 
}) => {
  const { directories, isLoading, error, addDirectory, removeDirectory } = useDirectories();
  const [newDirectoryPath, setNewDirectoryPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '', visible: false });

  const showFeedback = (message, type = 'info') => {
    setFeedback({ message, type, visible: true });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleAddDirectory = async () => {
    if (!newDirectoryPath.trim()) {
      showFeedback('Please enter a directory path', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addDirectory(newDirectoryPath.trim());
      
      if (result.success) {
        setNewDirectoryPath('');
        showFeedback('Directory added successfully!', 'success');
      } else {
        showFeedback(result.error || 'Failed to add directory', 'error');
      }
    } catch (err) {
      showFeedback('Failed to add directory', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDirectory = async (path) => {
    if (window.confirm(`Are you sure you want to remove "${path}" from being watched?`)) {
      try {
        const result = await removeDirectory(path);
        
        if (result.success) {
          showFeedback('Directory removed successfully!', 'success');
        } else {
          showFeedback(result.error || 'Failed to remove directory', 'error');
        }
      } catch (err) {
        showFeedback('Failed to remove directory', 'error');
      }
    }
  };

  const handleBrowseDirectory = async () => {
    // Check if we're running in Electron
    if (window.electron && window.electron.selectDirectory) {
      // Use Electron's native directory picker
      try {
        const directoryPath = await window.electron.selectDirectory();
        if (directoryPath) {
          setNewDirectoryPath(directoryPath);
        }
      } catch (error) {
        console.error('Failed to open directory picker:', error);
        showFeedback('Failed to open directory picker', 'error');
      }
    } else {
      // Fallback for web: Create a hidden file input for directory selection
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true; // This allows directory selection
      input.multiple = true;
      
      input.onchange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          // Get the directory path from the first file
          const firstFile = files[0];
          
          // Try to extract directory path from file path
          if (firstFile.path) {
            // If we have the full path, extract directory
            const directoryPath = firstFile.path.replace(/[^/\\]*$/, '').replace(/[/\\]$/, '');
            setNewDirectoryPath(directoryPath);
          } else {
            // Fallback: use webkitRelativePath to construct path
            const pathParts = firstFile.webkitRelativePath.split('/');
            if (pathParts.length > 1) {
              const directoryName = pathParts[0];
              setNewDirectoryPath(directoryName);
              showFeedback('Directory selected. You may need to adjust the full path.', 'info');
            }
          }
        }
      };
      
      input.click();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAdding) {
      handleAddDirectory();
    }
  };

  return (
    <aside className="w-70 glass-dark border-r border-white/10 divider-glow flex flex-col">
      {/* Feedback Message */}
      {feedback.visible && (
        <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
          feedback.type === 'success' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
          feedback.type === 'error' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
          'bg-blue-500/20 text-blue-700 dark:text-blue-400'
        }`}>
          {feedback.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {feedback.type === 'error' && <AlertCircle className="w-4 h-4" />}
          {feedback.type === 'info' && <AlertCircle className="w-4 h-4" />}
          <span className="text-xs">{feedback.message}</span>
        </div>
      )}

      {/* Add Directory Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center">
            <FolderPlus className="w-4 h-4 mr-2 text-neon-500" />
            Add Directory
          </h3>
          <button 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300" 
            onClick={() => onToggleSection('addDirectory')}
          >
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 dark:text-gray-300 transition-transform duration-300 ${
                collapsedSections.addDirectory ? '-rotate-90' : ''
              }`} 
            />
          </button>
        </div>
        
        {!collapsedSections.addDirectory && (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter directory path..."
                value={newDirectoryPath}
                onChange={(e) => setNewDirectoryPath(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-2 py-1.5 rounded text-xs glass neon-border text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-neon-500/50"
                disabled={isAdding}
              />
              <button
                onClick={handleBrowseDirectory}
                className="px-2 py-1.5 rounded bg-cyber-500/20 text-cyber-700 dark:text-cyber-400 hover:bg-cyber-500/30 transition-all duration-300 text-xs"
                disabled={isAdding}
                title="Browse for directory"
              >
                <FolderOpen className="w-3 h-3" />
              </button>
            </div>
            
            <button
              onClick={handleAddDirectory}
              disabled={isAdding || !newDirectoryPath.trim()}
              className="w-full px-3 py-1.5 rounded bg-gradient-to-r from-neon-500 to-cyber-500 text-white text-xs font-medium hover:from-neon-600 hover:to-cyber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-1"
            >
              {isAdding ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3 h-3" />
                  <span>Add & Index</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Browse or enter path to watch and index files.
            </p>
          </div>
        )}
      </div>

      {/* Watched Directories Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Watched Directories</h3>
          <button 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300" 
            onClick={() => onToggleSection('projects')}
          >
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 dark:text-gray-300 transition-transform duration-300 ${
                collapsedSections.projects ? '-rotate-90' : ''
              }`} 
            />
          </button>
        </div>
        
        {!collapsedSections.projects && (
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-500"></div>
              </div>
            ) : error ? (
              <div className="flex items-center space-x-2 p-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Failed to load directories</span>
              </div>
            ) : directories.length > 0 ? (
              directories.map((dir, index) => (
                <div key={dir.path} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition-all duration-300 group">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-neon-500 to-neon-600 flex items-center justify-center group-hover:animate-pulse-glow shadow-sm flex-shrink-0">
                    <Folder className="w-3 h-3 text-white drop-shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-white truncate">
                      {dir.path.split(/[/\\]/).pop() || dir.path}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 truncate">
                      {dir.path.length > 30 ? '...' + dir.path.slice(-27) : dir.path}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDirectory(dir.path);
                    }}
                    className="p-1 rounded bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-all duration-300 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remove directory"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">No directories watched</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add directories above</p>
              </div>
            )}
            
            {/* Show sample data if no directories are loaded yet */}
            {!isLoading && !error && directories.length === 0 && (
              <>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition-all duration-300 group opacity-50">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-neon-500 to-neon-600 flex items-center justify-center group-hover:animate-pulse-glow shadow-sm">
                    <Folder className="w-3 h-3 text-white drop-shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-white">Sample Project</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">Add directories to see real projects</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Memory Lane Section */}
      <div className="p-4 border-b border-white/10 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Memory Lane</h3>
          <button 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300" 
            onClick={() => onToggleSection('memory')}
          >
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 dark:text-gray-300 transition-transform duration-300 ${
                collapsedSections.memory ? '-rotate-90' : ''
              }`} 
            />
          </button>
        </div>
        
        {!collapsedSections.memory && (
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition-all duration-300 group">
              <div className="w-6 h-6 rounded bg-neon-500 flex items-center justify-center mt-1 group-hover:animate-pulse shadow-sm">
                <FileText className="w-3 h-3 text-white drop-shadow-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-800 dark:text-white">research_notes.md</p>
                <p className="text-xs text-gray-600 dark:text-gray-200 mt-1">AI summarizes key ML concepts and recent breakthroughs...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 min ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition-all duration-300 group">
              <div className="w-6 h-6 rounded bg-cyber-500 flex items-center justify-center mt-1 group-hover:animate-pulse shadow-sm">
                <Image className="w-3 h-3 text-white drop-shadow-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-800 dark:text-white">architecture.png</p>
                <p className="text-xs text-gray-600 dark:text-gray-200 mt-1">System diagram showing microservices architecture...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">15 min ago</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Co-Pilot Mode Toggle */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-neon-500 to-cyber-500 flex items-center justify-center shadow-lg ${
              coPilotActive ? 'animate-pulse-glow' : ''
            }`}>
              <Brain className="w-3 h-3 text-white drop-shadow-sm" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Co-Pilot Mode</span>
          </div>
          <button 
            className="relative w-12 h-6 neumorphic-dark rounded-full transition-all duration-300" 
            onClick={onToggleCoPilot}
          >
            <div 
              className={`absolute top-1 left-1 w-4 h-4 bg-gradient-to-r from-neon-500 to-cyber-500 rounded-full shadow-lg transition-transform duration-300 ${
                coPilotActive ? 'transform translate-x-6 animate-pulse-glow' : ''
              }`} 
            />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

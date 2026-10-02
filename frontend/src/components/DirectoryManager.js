import React, { useState } from 'react';
import { FolderPlus, FolderOpen, Trash2, AlertCircle, CheckCircle, Loader, Folder } from 'lucide-react';
import { useDirectories } from '../hooks/useDirectories';

const DirectoryManager = () => {
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

  const handleBrowseDirectory = () => {
    // In a real Electron app, you'd use the native file dialog
    // For now, we'll show a message
    showFeedback('Directory browser not available in web mode. Please enter the path manually.', 'info');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAdding) {
      handleAddDirectory();
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Feedback Message */}
      {feedback.visible && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
          feedback.type === 'success' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
          feedback.type === 'error' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
          'bg-blue-500/20 text-blue-700 dark:text-blue-400'
        }`}>
          {feedback.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {feedback.type === 'error' && <AlertCircle className="w-4 h-4" />}
          {feedback.type === 'info' && <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Add Directory Section */}
      <div className="glass rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
          <FolderPlus className="w-4 h-4 mr-2 text-neon-500" />
          Add Directory
        </h3>
        
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter directory path (e.g., C:\Documents\Projects)"
              value={newDirectoryPath}
              onChange={(e) => setNewDirectoryPath(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 rounded-lg glass neon-border text-sm text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-500/50 dark:focus:ring-cyber-500/50"
              disabled={isAdding}
            />
            <button
              onClick={handleBrowseDirectory}
              className="px-3 py-2 rounded-lg bg-cyber-500/20 text-cyber-700 dark:text-cyber-400 hover:bg-cyber-500/30 transition-all duration-300 text-sm"
              disabled={isAdding}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleAddDirectory}
            disabled={isAdding || !newDirectoryPath.trim()}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-neon-500 to-cyber-500 text-white text-sm font-medium hover:from-neon-600 hover:to-cyber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isAdding ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Adding Directory...</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                <span>Add & Index Directory</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Adding a directory will start watching it for file changes and index all supported files.
        </p>
      </div>

      {/* Watched Directories List */}
      <div className="glass rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
          Watched Directories
        </h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-neon-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading directories...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error}</span>
          </div>
        ) : directories.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No directories are being watched yet.</p>
            <p className="text-xs">Add a directory above to start indexing files.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {directories.map((dir) => (
              <div
                key={dir.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-500 to-cyber-500 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {dir.path}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Added: {new Date(dir.added_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveDirectory(dir.path)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  title="Remove directory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectoryManager;

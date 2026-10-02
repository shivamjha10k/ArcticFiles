import { useState, useCallback } from 'react';
import { apiService, APIError } from '../services/api';

/**
 * Hook for managing file operations
 * Handles indexing, reindexing, and removing files
 */
export const useFileOperations = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Index a single file
  const indexFile = useCallback(async (filePath) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await apiService.files.index(filePath);
      
      if (result.ok) {
        return { success: true, data: result.result };
      } else {
        throw new Error(result.error || 'Failed to index file');
      }
    } catch (err) {
      console.error('Failed to index file:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Failed to index file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Reindex a file (update existing index)
  const reindexFile = useCallback(async (filePath) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await apiService.files.reindex(filePath);
      
      if (result.ok) {
        return { success: true, data: result.result };
      } else {
        throw new Error(result.error || 'Failed to reindex file');
      }
    } catch (err) {
      console.error('Failed to reindex file:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Failed to reindex file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Remove a file from the index
  const removeFile = useCallback(async (filePath) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await apiService.files.remove(filePath);
      
      if (result.ok) {
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to remove file');
      }
    } catch (err) {
      console.error('Failed to remove file:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Failed to remove file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    indexFile,
    reindexFile,
    removeFile,
    isProcessing,
    error,
    clearError,
  };
};

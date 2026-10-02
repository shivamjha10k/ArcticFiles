import { useState, useEffect, useCallback } from 'react';
import { apiService, APIError } from '../services/api';

/**
 * Hook for managing directories state and operations
 * Handles adding, listing, and removing watched directories
 */
export const useDirectories = () => {
  const [directories, setDirectories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load directories from backend
  const loadDirectories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const directoryList = await apiService.directories.list();
      setDirectories(directoryList);
    } catch (err) {
      console.error('Failed to load directories:', err);
      setError(err instanceof APIError ? err.message : 'Failed to load directories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new directory
  const addDirectory = useCallback(async (path) => {
    try {
      setError(null);
      const result = await apiService.directories.set(path);
      
      if (result.ok) {
        // Reload directories to get the updated list
        await loadDirectories();
        return { success: true, data: result.directory };
      } else {
        throw new Error(result.error || 'Failed to add directory');
      }
    } catch (err) {
      console.error('Failed to add directory:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Failed to add directory';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadDirectories]);

  // Remove a directory
  const removeDirectory = useCallback(async (path) => {
    try {
      setError(null);
      const result = await apiService.directories.remove(path);
      
      if (result.ok) {
        // Reload directories to get the updated list
        await loadDirectories();
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to remove directory');
      }
    } catch (err) {
      console.error('Failed to remove directory:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Failed to remove directory';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadDirectories]);

  // Load directories on mount
  useEffect(() => {
    loadDirectories();
  }, [loadDirectories]);

  return {
    directories,
    isLoading,
    error,
    addDirectory,
    removeDirectory,
    refreshDirectories: loadDirectories,
  };
};

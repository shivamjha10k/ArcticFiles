import { useState, useCallback, useRef } from 'react';
import { apiService, APIError } from '../services/api';

/**
 * Hook for managing search functionality
 * Handles semantic search and AI questions
 */
export const useSearch = () => {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const abortControllerRef = useRef(null);

  // Perform semantic search
  const search = useCallback(async (query, topK = 10) => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      setLastQuery('');
      setError(null);
      return;
    }

    // Cancel previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsSearching(true);
      setError(null);
      setLastQuery(query);

      const response = await apiService.search.semantic(query, topK);
      
      if (response.ok && response.results) {
        // Transform backend results to match frontend format
        const transformedResults = response.results.results || [];
        
        // Find the highest score to normalize against
        const scores = transformedResults.map(result => result.score || 0);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        const formattedResults = transformedResults.map((result, index) => {
          // Normalize score relative to the highest score
          let normalizedMatch;
          if (maxScore === minScore) {
            // All scores are the same, so all get 100%
            normalizedMatch = 100;
          } else if (maxScore > 0) {
            // Normalize so highest score = 100%, others relative to it
            normalizedMatch = Math.round(((result.score || 0) / maxScore) * 100);
          } else {
            // Handle case where all scores are negative or zero
            normalizedMatch = Math.round((((result.score || 0) - minScore) / (maxScore - minScore)) * 100);
          }
          
          // Ensure minimum 1% for any result that was returned
          normalizedMatch = Math.max(1, normalizedMatch);
          
          return {
            id: `search-${index}`,
            filename: result.file_name || 'Unknown',
            filePath: result.file_path || '',
            type: getFileType(result.file_name || ''),
            match: normalizedMatch,
            description: result.chunk || 'No description available',
            chunkIndex: result.chunk_index || 0,
            fileSize: result.file_size || 0,
            chunkSize: result.chunk_size || 0,
            score: result.score || 0, // Keep original score for deduplication
          };
        });

        // Deduplicate by file path - keep the chunk with highest score for each file
        const fileMap = new Map();

        formattedResults.forEach(result => {
          const key = result.filePath;
          if (!fileMap.has(key) || result.score > fileMap.get(key).score) {
            fileMap.set(key, result);
          }
        });

        // Convert map values to array and re-assign sequential IDs
        const finalResults = Array.from(fileMap.values()).map((result, index) => ({
          ...result,
          id: `search-${index}`
        }));

        setResults(finalResults);
      } else {
        setResults([]);
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      console.error('Search failed:', err);
      const errorMessage = err instanceof APIError ? err.message : 'Search failed';
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Ask AI a question
  const askAI = useCallback(async (question, topK = 5, fileId = null) => {
    if (!question || question.trim().length === 0) {
      return { success: false, error: 'Question cannot be empty' };
    }

    try {
      setError(null);
      const response = await apiService.search.ask(question, topK, fileId);
      
      if (response.summary) {
        return { success: true, answer: response.summary, summary: response.summary };
      } else if (response.answer) {
        return { success: true, answer: response.answer };
      } else {
        const errorMsg = response.error || 'AI question failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('AI question failed:', err);
      const errorMessage = err instanceof APIError ? err.message : 'AI question failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Clear search results
  const clearResults = useCallback(() => {
    setResults([]);
    setLastQuery('');
    setError(null);
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    results,
    isSearching,
    error,
    lastQuery,
    search,
    askAI,
    clearResults,
  };
};

/**
 * Helper function to determine file type from filename
 */
const getFileType = (filename) => {
  const extension = filename.toLowerCase().split('.').pop();
  
  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'cs'];
  const documentExtensions = ['md', 'txt', 'pdf', 'doc', 'docx', 'rtf', 'odt'];
  const dataExtensions = ['json', 'xml', 'csv', 'yaml', 'yml', 'toml', 'ini', 'sql', 'db', 'sqlite'];
  
  if (codeExtensions.includes(extension)) return 'code';
  if (documentExtensions.includes(extension)) return 'document';
  if (dataExtensions.includes(extension)) return 'data';
  
  return 'document'; // default
};

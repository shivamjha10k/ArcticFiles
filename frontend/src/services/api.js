/**
 * API Service for communicating with the backend
 * Handles all HTTP requests to the Node.js backend which communicates with the Python worker
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(user?.id ? { 'x-user-id': user.id } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    // Handle network errors
    throw new APIError(
      `Network error: ${error.message}`,
      0,
      { originalError: error.message }
    );
  }
};

export const apiService = {
  // Auth Operations
  auth: {
    async register(username, password) {
      return apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    async login(username, password) {
      return apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
  },

  // Directory Management
  directories: {
    /**
     * Set/add a directory for watching and indexing
     * @param {string} path - Directory path to watch
     * @returns {Promise<Object>} Directory info
     */
    async set(path) {
      return apiRequest('/set-directory', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
    },

    /**
     * Get list of all watched directories
     * @returns {Promise<Array>} List of directories
     */
    async list() {
      return apiRequest('/directories', {
        method: 'GET',
      });
    },

    /**
     * Remove a directory from watching
     * @param {string} path - Directory path to remove
     * @returns {Promise<Object>} Success response
     */
    async remove(path) {
      return apiRequest('/remove-directory', {
        method: 'DELETE',
        body: JSON.stringify({ path }),
      });
    },
  },

  // File Operations
  files: {
    /**
     * Index a single file
     * @param {string} path - File path to index
     * @returns {Promise<Object>} Indexing result
     */
    async index(path) {
      return apiRequest('/index-file', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
    },

    /**
     * Reindex a file (update existing index)
     * @param {string} path - File path to reindex
     * @returns {Promise<Object>} Reindexing result
     */
    async reindex(path) {
      return apiRequest('/reindex-file', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
    },

    /**
     * Remove a file from the index
     * @param {string} path - File path to remove
     * @returns {Promise<Object>} Removal result
     */
    async remove(path) {
      return apiRequest('/remove-file', {
        method: 'DELETE',
        body: JSON.stringify({ path }),
      });
    },

    /**
     * Get content of a file
     * @param {string} path - File path
     * @returns {Promise<Object>} File content
     */
    async getContent(path) {
      return apiRequest('/file-content', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
    },
  },

  // Search Operations
  search: {
    /**
     * Perform semantic search across indexed files
     * @param {string} query - Search query
     * @param {number} topK - Number of results to return (default: 5)
     * @returns {Promise<Object>} Search results
     */
    async semantic(query, topK = 5) {
      return apiRequest('/search', {
        method: 'POST',
        body: JSON.stringify({ query, top_k: topK }),
      });
    },

    /**
     * Ask AI a question about the indexed content
     * @param {string} query - Question to ask
     * @param {number} topK - Number of context results to use (default: 5)
     * @param {string} fileId - Optional file ID to ask about specific file
     * @returns {Promise<Object>} AI response
     */
    async ask(query, topK = 5, fileId = null) {
      const body = { query, topK };
      if (fileId) {
        body.fileId = fileId;
      }
      return apiRequest('/ask', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },

  // Health Check
  health: {
    /**
     * Check if the backend is healthy
     * @returns {Promise<Object>} Health status
     */
    async check() {
      return apiRequest('/health', {
        method: 'GET',
      });
    },
  },
};

export { APIError };
export default apiService;

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  
  // File operations
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openWindowsPreview: (filePath) => ipcRenderer.invoke('open-windows-preview', filePath),
  showInExplorer: (filePath) => ipcRenderer.invoke('show-in-explorer', filePath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  
  // Platform info
  platform: process.platform,
  
  // App version info  
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Theme persistence for Electron
  getTheme: async () => {
    try {
      // First try IPC, then fallback to localStorage
      const ipcTheme = await ipcRenderer.invoke('get-theme');
      if (ipcTheme) return ipcTheme;
      
      return localStorage.getItem('theme') || 'light';
    } catch (error) {
      console.error('Error getting theme:', error);
      try {
        return localStorage.getItem('theme') || 'light';
      } catch {
        return 'light';
      }
    }
  },
  
  setTheme: async (theme) => {
    try {
      // Store in both IPC and localStorage
      await ipcRenderer.invoke('set-theme', theme);
      localStorage.setItem('theme', theme);
      return true;
    } catch (error) {
      console.error('Error setting theme:', error);
      try {
        localStorage.setItem('theme', theme);
        return true;
      } catch {
        return false;
      }
    }
  }
});

// Expose a simple API for React to use
contextBridge.exposeInMainWorld('electron', {
  // Directory selection
  selectDirectory: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  
  // File operations
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openWindowsPreview: (filePath) => ipcRenderer.invoke('open-windows-preview', filePath),
  showInExplorer: (filePath) => ipcRenderer.invoke('show-in-explorer', filePath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  
  // Platform info
  platform: process.platform,
  
  // App version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Backend communication methods
  search: (query) => {
    return fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    }).then(res => res.json());
  },
  
  addFolder: (folderPath) => {
    return fetch('http://localhost:3000/api/set-directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: folderPath })
    }).then(res => res.json());
  }
});

// Keep the old API for compatibility
contextBridge.exposeInMainWorld('api', {
  // Backend communication methods will go here
  search: (query) => {
    // This will communicate with your Node.js backend
    return fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    }).then(res => res.json());
  },
  
  addFolder: (folderPath) => {
    return fetch('http://localhost:3000/api/set-directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: folderPath })
    }).then(res => res.json());
  }
});

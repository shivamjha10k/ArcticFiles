const { app, BrowserWindow, dialog, ipcMain, shell, protocol } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const WindowsPreviewHandler = require('./WindowsPreviewHandler');

let mainWindow;
const previewHandler = new WindowsPreviewHandler();

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow local storage access
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, '../build/icon.png'), // You can add an icon later
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder to Index'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// IPC handlers for theme management
let currentTheme = 'light';

ipcMain.handle('get-theme', () => {
  return currentTheme;
});

ipcMain.handle('set-theme', (event, theme) => {
  currentTheme = theme;
  return true;
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select Files to Index',
    filters: [
      { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

// Windows Preview Handler IPC
ipcMain.handle('open-windows-preview', async (event, filePath) => {
  try {
    return await previewHandler.openWithPreviewHandler(filePath);
  } catch (error) {
    console.error('Windows Preview error:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced file operations
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-in-explorer', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // Check file extension to determine if it's binary
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.rar', '.exe'];
    
    if (binaryExtensions.includes(ext)) {
      // For binary files, read as base64
      const content = await fs.readFile(filePath);
      const base64Content = content.toString('base64');
      return { success: true, content: base64Content, encoding: 'base64', mimeType: getMimeType(ext) };
    } else {
      // For text files, read as UTF-8
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content, encoding: 'utf8' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper function to get MIME type
function getMimeType(extension) {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// Get file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    // Get basic file stats
    const stats = await fs.stat(filePath);
    
    // Get enhanced Windows file info if available
    let enhancedInfo = null;
    if (process.platform === 'win32') {
      const windowsInfo = await previewHandler.getFileInfo(filePath);
      if (windowsInfo.success) {
        enhancedInfo = windowsInfo.info;
      }
    }

    return {
      success: true,
      stats: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        ...(enhancedInfo || {})
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(() => {
  // Register custom protocol for safe file access
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.substr(12); // Remove 'safe-file://' prefix
    const filePath = path.normalize(decodeURIComponent(url));
    callback({ path: filePath });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app protocol for development
if (isDev) {
  app.setAsDefaultProtocolClient('arcticfiles', process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient('arcticfiles');
}

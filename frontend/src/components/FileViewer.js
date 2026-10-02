import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, FileText, Image, Video, Music, File, AlertCircle, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import * as mammoth from 'mammoth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// PDF Preview Component
const PDFPreview = ({ filePath, onError }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPDF();
  }, [filePath]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try different methods to load the PDF
      const methods = [
        // Method 1: Direct file URL
        () => `file:///${filePath.replace(/\\/g, '/')}`,
        
        // Method 2: Blob URL (if we can read the file as base64)
        async () => {
          if (window.electronAPI?.readFile) {
            const result = await window.electronAPI.readFile(filePath);
            if (result.success && result.content) {
              if (result.encoding === 'base64') {
                // Convert base64 to blob
                const binaryString = atob(result.content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: result.mimeType || 'application/pdf' });
                return URL.createObjectURL(blob);
              } else {
                // For text content, create blob directly
                const blob = new Blob([result.content], { type: 'application/pdf' });
                return URL.createObjectURL(blob);
              }
            }
          }
          throw new Error('Could not read file');
        },
        
        // Method 3: Use Electron's built-in protocol
        () => `safe-file:///${filePath.replace(/\\/g, '/')}`
      ];

      let pdfUrl = null;
      let lastError = null;

      for (const method of methods) {
        try {
          pdfUrl = typeof method === 'function' ? await method() : method;
          if (pdfUrl) {
            // Test if the URL works
            const response = await fetch(pdfUrl, { method: 'HEAD' });
            if (response.ok) {
              setPdfUrl(pdfUrl);
              return;
            }
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      throw lastError || new Error('Could not load PDF');
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            PDF Load Error
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <div className="space-y-2">
            <button
              onClick={loadPDF}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">PDF could not be loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-700">
      <div className="w-full h-full">
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full"
            title="PDF Preview"
            onError={() => setError('PDF viewer not available')}
          >
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center max-w-md p-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  PDF Preview Unavailable
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your browser doesn't support PDF preview. Please install a PDF viewer or use the system app.
                </p>
                <button
                  onClick={() => window.electronAPI?.openFile(filePath)}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Open with System App
                </button>
              </div>
            </div>
          </iframe>
        </object>
      </div>
    </div>
  );
};

// DOCX Preview Component
const DOCXPreview = ({ filePath, onError }) => {
  const [htmlContent, setHtmlContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDOCX();
  }, [filePath]);

  const loadDOCX = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile(filePath);
        if (result.success && result.content && result.encoding === 'base64') {
          const binaryString = atob(result.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;
          const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(mammothResult.value);
        } else {
          throw new Error('Could not read DOCX file');
        }
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading DOCX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">DOCX Load Error</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 overflow-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white text-black p-8 shadow-lg min-h-[800px] docx-preview-content" 
           dangerouslySetInnerHTML={{ __html: htmlContent }} 
           style={{
             fontFamily: 'Calibri, Arial, sans-serif',
             lineHeight: '1.6'
           }}
      />
    </div>
  );
};

// PPTX Preview Component (Text-only)
const PPTXPreview = ({ filePath, onError }) => {
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPPTX();
  }, [filePath]);

  const loadPPTX = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Import apiService locally here to avoid circular dependencies if it happens
      const { apiService } = await import('../services/api');
      
      const response = await apiService.files.getContent(filePath);
      if (response && response.content) {
        setTextContent(response.content);
      } else {
        throw new Error('Could not extract text from PPTX file. File might be empty or not indexed yet.');
      }
    } catch (err) {
      setError(err.message || 'Failed to read PPTX text');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Extracting presentation text...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">PPTX Extraction Error</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 overflow-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-8 shadow-lg min-h-[800px] rounded-lg">
        <h2 className="text-2xl font-bold mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">Presentation Content</h2>
        <div className="whitespace-pre-wrap font-sans leading-relaxed text-lg">
          {textContent}
        </div>
      </div>
    </div>
  );
};

// Spreadsheet Preview Component
const SpreadsheetPreview = ({ filePath, onError }) => {
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSpreadsheet();
  }, [filePath]);

  const loadSpreadsheet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { apiService } = await import('../services/api');
      const response = await apiService.files.getContent(filePath);
      if (response && response.content) {
        setTextContent(response.content);
      } else {
        throw new Error('Could not extract text from Spreadsheet file.');
      }
    } catch (err) {
      setError(err.message || 'Failed to read Spreadsheet text');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading spreadsheet data...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-500">{error}</div>;

  // Parse our custom text format into a table
  const lines = (textContent || '').split('\n');
  const cols = lines[0]?.replace('Spreadsheet Columns: ', '').split(', ') || [];
  const rows = lines.slice(2).filter(line => line.startsWith('Row ')).map(line => {
    // line looks like: "Row 1: col1: val1 | col2: val2"
    const content = line.substring(line.indexOf(':') + 1).trim();
    const cells = content.split(' | ');
    const rowMap = {};
    cells.forEach(cell => {
      const idx = cell.indexOf(':');
      if (idx > -1) {
        rowMap[cell.substring(0, idx).trim()] = cell.substring(idx + 1).trim();
      }
    });
    return rowMap;
  });

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 overflow-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400 sticky top-0">
              <tr>
                {cols.map((col, i) => (
                  <th key={i} scope="col" className="px-6 py-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {cols.map((col, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap">{row[col] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ZIP Preview Component
const ZipPreview = ({ filePath, onError }) => {
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFile, setActiveFile] = useState(null);

  useEffect(() => {
    loadZip();
  }, [filePath]);

  const loadZip = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { apiService } = await import('../services/api');
      const response = await apiService.files.getContent(filePath);
      if (response && response.content) {
        setTextContent(response.content);
      } else {
        throw new Error('Could not extract text from ZIP file.');
      }
    } catch (err) {
      setError(err.message || 'Failed to read ZIP text');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading ZIP archive...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-500">{error}</div>;

  // Parse the custom ZIP format
  const blocks = (textContent || '').split('\n\n--- CONTENT FROM FILE: ');
  const files = [];
  blocks.forEach(block => {
    if (!block.trim()) return;
    const match = block.indexOf(' ---');
    if (match > -1) {
      const filename = block.substring(0, match);
      const content = block.substring(match + 4).trim();
      files.push({ filename, content });
    }
  });

  const selectedFileContent = activeFile ? files.find(f => f.filename === activeFile)?.content : files[0]?.content;
  
  // Create simple file tree
  return (
    <div className="w-full h-full flex bg-gray-50 dark:bg-gray-900">
      <div className="w-1/3 min-w-[250px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
          Archive Contents
        </div>
        <ul className="py-2">
          {files.map((f, i) => (
            <li key={i}>
              <button 
                onClick={() => setActiveFile(f.filename)}
                className={`w-full text-left px-4 py-2 text-sm truncate flex items-center space-x-2 ${
                  (activeFile === f.filename || (!activeFile && i === 0))
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{f.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100 dark:bg-black">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 min-h-[600px]">
          <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200 pb-4 border-b border-gray-100 dark:border-gray-700">
            {activeFile || files[0]?.filename || 'Select a file'}
          </h3>
          <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed overflow-x-auto text-sm">
            {selectedFileContent || 'Empty file or no preview available'}
          </pre>
        </div>
      </div>
    </div>
  );
};



const FileViewer = ({ selectedFile, onError }) => {
  const [previewMode, setPreviewMode] = useState('embedded'); // 'native', 'embedded', 'system'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const previewContainerRef = useRef(null);

  // Load file content for embedded preview
  useEffect(() => {
    if (selectedFile && previewMode === 'embedded') {
      loadFileForPreview();
    }
  }, [selectedFile, previewMode]);

  const loadFileForPreview = async () => {
    if (!selectedFile?.filePath) return;

    try {
      setIsLoading(true);
      setError(null);
      setPreviewContent(null);

      // Get file stats first
      if (window.electronAPI?.getFileStats) {
        const statsResult = await window.electronAPI.getFileStats(selectedFile.filePath);
        if (statsResult.success) {
          setFileStats(statsResult.stats);
        }
      }

      const fileType = getFileType(selectedFile.filePath);
      
      // Load content based on file type
      switch (fileType) {
        case 'text':
          await loadTextContent();
          break;
        case 'image':
          await loadImageContent();
          break;
        case 'document':
          await loadDocumentContent();
          break;
        case 'spreadsheet':
          setPreviewContent({ type: 'spreadsheet', src: selectedFile.filePath, filename: selectedFile.filename });
          break;
        case 'zip':
          setPreviewContent({ type: 'zip', src: selectedFile.filePath, filename: selectedFile.filename });
          break;
        default:
          setPreviewContent({ type: 'unsupported', message: 'Preview not supported for this file type' });
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTextContent = async () => {
    try {
      if (window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile(selectedFile.filePath);
        if (result.success) {
          setPreviewContent({ type: 'text', content: result.content });
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err) {
      setPreviewContent({ type: 'error', message: 'Failed to load text content' });
    }
  };

  const loadImageContent = async () => {
    try {
      // For images, we can use file:// protocol in Electron
      setPreviewContent({ 
        type: 'image', 
        src: selectedFile.filePath.replace(/\\/g, '/'),
        filename: selectedFile.filename
      });
    } catch (err) {
      setPreviewContent({ type: 'error', message: 'Failed to load image' });
    }
  };

  const loadDocumentContent = async () => {
    try {
      const extension = selectedFile.filePath.split('.').pop()?.toLowerCase();
      
      if (extension === 'pdf') {
        // For PDFs, we'll create an embedded viewer
        setPreviewContent({ 
          type: 'pdf', 
          src: selectedFile.filePath.replace(/\\/g, '/'),
          filename: selectedFile.filename
        });
      } else if (extension === 'docx') {
        // For DOCX
        setPreviewContent({ 
          type: 'docx', 
          src: selectedFile.filePath.replace(/\\/g, '/'),
          filename: selectedFile.filename
        });
      } else if (extension === 'pptx' || extension === 'ppt') {
        // For PPTX
        setPreviewContent({
          type: 'pptx',
          src: selectedFile.filePath.replace(/\\/g, '/'),
          filename: selectedFile.filename
        });
      } else {
        // For other documents, offer to open with system app
        setPreviewContent({ 
          type: 'document', 
          filename: selectedFile.filename,
          extension: extension
        });
      }
    } catch (err) {
      setPreviewContent({ type: 'error', message: 'Failed to load document' });
    }
  };
  const getFileType = (filePath) => {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
    const docExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'h'];
    const spreadsheetExts = ['xls', 'xlsx', 'csv'];
    const zipExts = ['zip'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (spreadsheetExts.includes(ext)) return 'spreadsheet';
    if (zipExts.includes(ext)) return 'zip';
    if (docExts.includes(ext)) return 'document';
    if (textExts.includes(ext)) return 'text';
    return 'unknown';
  };

  // Windows Native Preview Handler
  const openWithWindowsPreview = async (filePath) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we're on Windows
      const isWindows = window.electronAPI?.platform === 'win32';
      
      if (!isWindows) {
        // Fallback for non-Windows systems
        if (window.electronAPI?.openFile) {
          const result = await window.electronAPI.openFile(filePath);
          return result;
        }
        throw new Error('Platform not supported');
      }

      // Try Windows-specific preview handler
      if (window.electronAPI?.openWindowsPreview) {
        const result = await window.electronAPI.openWindowsPreview(filePath);
        if (result.success) {
          return result;
        }
        
        // Log the attempt but continue to fallback
        console.log('Windows Preview Handler result:', result);
      }

      // Fallback: Open with system default
      if (window.electronAPI?.openFile) {
        const fallbackResult = await window.electronAPI.openFile(filePath);
        return fallbackResult.success ? fallbackResult : { 
          success: true, 
          message: 'File opened with system default application' 
        };
      }

      // Last resort: Show in explorer
      if (window.electronAPI?.showInExplorer) {
        await window.electronAPI.showInExplorer(filePath);
        return { success: true, message: 'File shown in Windows Explorer' };
      }

      throw new Error('No file opening method available');

    } catch (err) {
      const errorMessage = err.message || 'Failed to open file';
      setError(errorMessage);
      onError?.(err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced embedded preview renderer
  const renderEmbeddedPreview = () => {
    if (!selectedFile || isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (!previewContent) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <File className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No preview available</p>
          </div>
        </div>
      );
    }

    switch (previewContent.type) {
      case 'text': {
        const fileExt = selectedFile?.filePath?.split('.').pop()?.toLowerCase() || 'text';
        const languageMap = {
          'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
          'py': 'python', 'json': 'json', 'html': 'html', 'css': 'css',
          'md': 'markdown', 'xml': 'xml', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c'
        };
        const lang = languageMap[fileExt] || 'text';

        return (
          <div className="w-full h-full p-4 bg-[#1e1e1e] overflow-auto">
            <div className="max-w-full h-full flex flex-col">
              <div className="flex justify-between items-center mb-2 px-2 shrink-0">
                <span className="text-gray-400 text-sm font-mono">{selectedFile?.filename}</span>
                <span className="text-gray-500 text-xs font-mono uppercase">{lang}</span>
              </div>
              <div className="flex-1 overflow-auto rounded-lg border border-[#333]">
                <SyntaxHighlighter 
                  language={lang} 
                  style={vscDarkPlus}
                  customStyle={{ background: '#1e1e1e', margin: 0, padding: '1rem', minHeight: '100%' }}
                  showLineNumbers={true}
                >
                  {previewContent.content}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        );
      }

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img 
                src={`file:///${previewContent.src}`}
                alt={previewContent.filename}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={() => setError('Failed to load image')}
              />
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white">PDF Preview</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{previewContent.filename}</p>
              </div>
              <div className="flex-1">
                <PDFPreview 
                  filePath={previewContent.src} 
                  onError={(err) => setError('Failed to load PDF: ' + err.message)}
                />
              </div>
            </div>
          </div>
        );

      case 'docx':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white">DOCX Preview</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{previewContent.filename}</p>
              </div>
              <div className="flex-1">
                <DOCXPreview 
                  filePath={previewContent.src} 
                  onError={(err) => setError('Failed to load DOCX: ' + err.message)}
                />
              </div>
            </div>
          </div>
        );

      case 'pptx':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white">PPTX Preview (Text Only)</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{previewContent.filename}</p>
              </div>
              <div className="flex-1">
                <PPTXPreview 
                  filePath={previewContent.src} 
                  onError={(err) => setError('Failed to load PPTX: ' + err.message)}
                />
              </div>
            </div>
          </div>
        );

      case 'spreadsheet':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white">Spreadsheet Viewer</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{previewContent.filename}</p>
                </div>
              </div>
              <div className="flex-1">
                <SpreadsheetPreview 
                  filePath={previewContent.src} 
                  onError={(err) => setError('Failed to load Spreadsheet: ' + err.message)}
                />
              </div>
            </div>
          </div>
        );

      case 'zip':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white">Archive Viewer</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{previewContent.filename}</p>
                </div>
              </div>
              <div className="flex-1">
                <ZipPreview 
                  filePath={previewContent.src} 
                  onError={(err) => setError('Failed to load ZIP: ' + err.message)}
                />
              </div>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                {previewContent.extension?.toUpperCase()} Document
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {previewContent.filename}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This document type requires an external application to preview.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => openWithWindowsPreview(selectedFile.filePath)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Open Document
                </button>
                <div>
                  <button
                    onClick={() => setPreviewMode('system')}
                    className="px-4 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Try System App
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'error':
      case 'unsupported':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                {previewContent.type === 'error' ? 'Preview Error' : 'Unsupported File Type'}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {previewContent.message}
              </p>
              <button
                onClick={() => openWithWindowsPreview(selectedFile.filePath)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open with System App
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <File className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Preview not available for this file type
              </p>
              <button
                onClick={() => openWithWindowsPreview(selectedFile.filePath)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open with System App
              </button>
            </div>
          </div>
        );
    }
  };

  // File type icon
  const getFileIcon = () => {
    const fileType = getFileType(selectedFile?.filePath);
    switch (fileType) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'document':
      case 'text': return <FileText className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  if (!selectedFile) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="glass rounded-lg p-8 max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              No File Selected
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select a file from the search results to preview its content.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center space-x-3">
          {getFileIcon()}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">
              {selectedFile.filename}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedFile.filePath}
            </p>
          </div>
        </div>

        {/* Preview Mode Toggle */}
        <div className="flex items-center space-x-2">
          {/* Platform indicator */}
          <div className="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-gray-600 dark:text-gray-400">
              {window.electronAPI?.platform === 'win32' ? '🪟 Windows' : 
               window.electronAPI?.platform === 'darwin' ? '🍎 macOS' : 
               window.electronAPI?.platform === 'linux' ? '🐧 Linux' : '🌐 Web'}
            </span>
          </div>

          <select
            value={previewMode}
            onChange={(e) => setPreviewMode(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          >
            <option value="embedded">Embedded Preview</option>
            {window.electronAPI?.platform === 'win32' && (
              <option value="native">Windows Preview</option>
            )}
            <option value="system">System App</option>
          </select>
          
          <button
            onClick={() => openWithWindowsPreview(selectedFile.filePath)}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isLoading ? 'Opening...' : 'Open'}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden" ref={previewContainerRef}>
        {previewMode === 'native' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <ExternalLink className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  Windows Native Preview
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Opens the file with Windows Preview Handler for the best native preview experience, 
                  similar to Windows Explorer's preview pane.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openWithWindowsPreview(selectedFile.filePath)}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening...
                    </span>
                  ) : (
                    'Open in Windows Preview'
                  )}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      if (window.electronAPI?.showInExplorer) {
                        await window.electronAPI.showInExplorer(selectedFile.filePath);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Show in Explorer
                  </button>
                  
                  <button
                    onClick={() => setPreviewMode('embedded')}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    Try Web Preview
                  </button>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                <p>
                  <strong>Windows Preview Handler features:</strong><br />
                  • Native Windows preview experience<br />
                  • Supports Office documents, PDFs, images<br />
                  • Same preview as Windows Explorer<br />
                  • Hardware-accelerated rendering
                </p>
              </div>
            </div>
          </div>
        )}

        {previewMode === 'embedded' && renderEmbeddedPreview()}

        {previewMode === 'system' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                System Application
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Open this file with its default system application
              </p>
              <button
                onClick={() => openWithWindowsPreview(selectedFile.filePath)}
                disabled={isLoading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Opening...' : 'Open with System App'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Details */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Match Score:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-white">
              {selectedFile.match}%
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">File Type:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-white">
              {getFileType(selectedFile.filePath)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Size:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-white">
              {fileStats?.size 
                ? `${Math.round(fileStats.size / 1024)} KB`
                : selectedFile.fileSize 
                ? `${Math.round(selectedFile.fileSize / 1024)} KB`
                : 'Unknown'
              }
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Chunk:</span>
            <span className="ml-2 font-medium text-gray-800 dark:text-white">
              {selectedFile.chunkIndex}
            </span>
          </div>
          {fileStats?.modified && (
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Modified:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">
                {new Date(fileStats.modified).toLocaleString()}
              </span>
            </div>
          )}
          {previewContent && (
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Preview:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">
                {previewContent.type === 'text' && previewContent.content 
                  ? `${previewContent.content.length} characters`
                  : previewContent.type
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;

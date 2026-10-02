const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');

class WindowsPreviewHandler {
  constructor() {
    this.isWindows = os.platform() === 'win32';
  }

  async openWithPreviewHandler(filePath) {
    if (!this.isWindows) {
      throw new Error('Windows Preview Handler is only available on Windows');
    }

    try {
      // Method 1: Try to use PowerShell with Windows Shell COM
      const result = await this.tryPowerShellPreview(filePath);
      if (result.success) {
        return result;
      }

      // Method 2: Try Quick Look alternative for Windows (if installed)
      const quickLookResult = await this.tryQuickLookWindows(filePath);
      if (quickLookResult.success) {
        return quickLookResult;
      }

      // Method 3: Use Windows Explorer Preview Pane
      return await this.openWithExplorerPreview(filePath);

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async tryPowerShellPreview(filePath) {
    try {
      const script = `
        # Load necessary assemblies
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        # File path
        $filePath = "${filePath.replace(/\\/g, '\\\\')}"
        
        if (-Not (Test-Path $filePath)) {
          Write-Output "ERROR: File not found: $filePath"
          exit 1
        }
        
        try {
          # Method 1: Try to use Shell Execute with preview verb
          $shell = New-Object -ComObject Shell.Application
          $folder = $shell.Namespace((Split-Path $filePath))
          $file = $folder.ParseName((Split-Path $filePath -Leaf))
          
          # Try to find and invoke preview verb
          $verbs = $file.Verbs()
          $previewVerb = $verbs | Where-Object { $_.Name -like "*preview*" -or $_.Name -like "*open*" }
          
          if ($previewVerb) {
            $previewVerb[0].DoIt()
            Write-Output "SUCCESS: File opened with preview handler"
            exit 0
          }
          
          # Method 2: Create a temporary HTML file that embeds the file (for supported types)
          $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
          $supportedTypes = @('.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.html', '.xml')
          
          if ($supportedTypes -contains $extension) {
            $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
            $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>File Preview - $(Split-Path $filePath -Leaf)</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Segoe UI; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .file-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .preview-container { border: 1px solid #ddd; min-height: 600px; }
        .fallback { text-align: center; padding: 50px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>File Preview</h1>
            <p><strong>File:</strong> $(Split-Path $filePath -Leaf)</p>
            <p><strong>Path:</strong> $filePath</p>
        </div>
        <div class="file-info">
            <p><strong>Type:</strong> $extension</p>
            <p><strong>Size:</strong> $((Get-Item $filePath).Length) bytes</p>
        </div>
        <div class="preview-container">
            <div class="fallback">
                <h3>Preview not available in browser</h3>
                <p>Click <a href="file:///$filePath" target="_blank">here</a> to open with default application</p>
                <br>
                <button onclick="window.external.openFile('$filePath')">Open File</button>
            </div>
        </div>
    </div>
    <script>
        // Auto-open the file after a short delay
        setTimeout(() => {
            window.open('file:///$filePath', '_blank');
        }, 1000);
    </script>
</body>
</html>
"@
            [System.IO.File]::WriteAllText($tempHtml, $htmlContent)
            Start-Process $tempHtml
            Write-Output "SUCCESS: File preview opened in browser"
            exit 0
          }
          
          # Method 3: Fallback to default application
          Start-Process $filePath
          Write-Output "SUCCESS: File opened with default application"
          exit 0
          
        } catch {
          Write-Output "ERROR: $($_.Exception.Message)"
          exit 1
        }
      `;

      return await this.executePowerShellScript(script);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async tryQuickLookWindows(filePath) {
    try {
      // Check if QuickLook for Windows is installed
      const quickLookPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'QuickLook');
      
      // Try to launch QuickLook
      const result = await new Promise((resolve) => {
        const proc = spawn('powershell', [
          '-Command',
          `& "${quickLookPath}\\QuickLook.exe" "${filePath}"`
        ], { windowsHide: true });

        let output = '';
        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', (code) => {
          resolve({ success: code === 0, output });
        });

        proc.on('error', () => {
          resolve({ success: false, error: 'QuickLook not found' });
        });
      });

      return result.success 
        ? { success: true, message: 'File opened with QuickLook' }
        : { success: false, error: 'QuickLook failed to open file' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async openWithExplorerPreview(filePath) {
    try {
      // Open Windows Explorer with the file selected and preview pane visible
      const script = `
        $filePath = "${filePath.replace(/\\/g, '\\\\')}"
        
        # Open Explorer with file selected
        explorer /select,"$filePath"
        
        # Wait a moment then try to enable preview pane
        Start-Sleep -Milliseconds 500
        
        # Send Alt+P to toggle preview pane (Windows shortcut)
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("%p")
        
        Write-Output "SUCCESS: Explorer opened with file selected and preview pane toggled"
      `;

      const result = await this.executePowerShellScript(script);
      return result.success 
        ? { success: true, message: 'File opened in Explorer with preview pane' }
        : result;

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executePowerShellScript(script) {
    return new Promise((resolve) => {
      const proc = spawn('powershell', [
        '-ExecutionPolicy', 'Bypass',
        '-Command', script
      ], { 
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && stdout.includes('SUCCESS')) {
          resolve({ success: true, message: stdout.trim() });
        } else {
          resolve({ 
            success: false, 
            error: stderr || stdout || `PowerShell script failed with code ${code}`
          });
        }
      });

      proc.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  async getFileInfo(filePath) {
    try {
      const script = `
        $filePath = "${filePath.replace(/\\/g, '\\\\')}"
        if (Test-Path $filePath) {
          $file = Get-Item $filePath
          $info = @{
            Name = $file.Name
            FullName = $file.FullName
            Extension = $file.Extension
            Size = $file.Length
            CreationTime = $file.CreationTime.ToString('yyyy-MM-dd HH:mm:ss')
            LastWriteTime = $file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            IsDirectory = $file.PSIsContainer
          }
          $info | ConvertTo-Json
        } else {
          Write-Output "File not found"
        }
      `;

      const result = await this.executePowerShellScript(script);
      if (result.success) {
        try {
          return { success: true, info: JSON.parse(result.message) };
        } catch {
          return { success: false, error: 'Failed to parse file info' };
        }
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = WindowsPreviewHandler;

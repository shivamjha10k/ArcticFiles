const express = require('express');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const worker = require('../lib/workerClient');
const watcher = require('../watcher/watcherManager');

router.post('/set-directory', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  
  if (!path || !fs.existsSync(path) || !fs.statSync(path).isDirectory()) {
    console.log('❌ Invalid directory path provided:', path);
    return res.status(400).json({ error: 'Invalid directory path' });
  }
  
  console.log('📁 ➕ Adding directory to index:', path);
  const dir = db.addDirectory(path, userId);
  
  try {
    console.log('🔄 Starting initial directory indexing...');
    // initial full index (blocking) - worker handles chunking
    await worker.indexDirectory(path, userId);
    console.log('✅ 📚 Directory indexed successfully');
    
    // after initial index, start watching only new changes
    console.log('🔄 Starting file watcher for directory...');
    watcher.startWatcher(path, userId); // Optional: add userId support to watcher later
    
    console.log('🎉 Directory setup complete! Ready for real-time updates.');
    res.json({ ok: true, directory: dir });
  } catch (err) {
    console.error('❌ 📚 Directory indexing failed:', err.message);
    res.status(500).json({ error: 'Indexing failed', details: err.message });
  }
});

router.get('/directories', (req, res) => {
  const userId = req.headers['x-user-id'] || null;
  res.json(db.listDirectories(userId));
});

router.delete('/remove-directory', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  try {
    console.log('🗑️ Removing directory from index by path:', path);
    const directories = db.getDirectories(userId);
    const deletedDir = directories.find(d => d.path === path);
    
    if (!deletedDir) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    // Stop watcher first so it doesn't re-add things
    console.log('🛑 Stopping watcher for directory:', deletedDir.path);
    watcher.stopWatcher(deletedDir.path, userId);
    
    // Find all files in this directory and remove them from Qdrant
    if (db.getAllFiles) {
        const allFiles = db.getAllFiles(userId);
        // Handle path separators correctly
        const pathPrefix = path.replace(/\\/g, '/').replace(/\\/g, '/');
        const filesToRemove = allFiles.filter(f => f.path.replace(/\\/g, '/').startsWith(pathPrefix));
        
        console.log(`🧹 Found ${filesToRemove.length} files to remove from Qdrant...`);
        for (const f of filesToRemove) {
            try {
                await worker.removeFile(f.path, userId);
                db.removeFile(f.path);
            } catch(e) {
                console.error(`Failed to remove ${f.path}:`, e.message);
            }
        }
    }
    
    const result = db.deleteDirectory(deletedDir.id, userId);
    
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Failed to remove directory:', err.message);
    res.status(500).json({ error: 'Failed to delete directory', details: err.message });
  }
});

module.exports = router;

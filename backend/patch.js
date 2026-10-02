const fs = require('fs');

// 1. Patch db/index.js
let dbContent = fs.readFileSync('src/db/index.js', 'utf8');
if (!dbContent.includes('getAllFiles(')) {
    dbContent = dbContent.replace(
        'getFile(path) {',
        "getAllFiles() { return db.prepare('SELECT * FROM files').all(); },\n  getFile(path) {"
    );
    fs.writeFileSync('src/db/index.js', dbContent, 'utf8');
}

// 2. Patch directories.js
let dirContent = fs.readFileSync('src/routes/directories.js', 'utf8');
const oldRoute = `router.delete('/remove-directory', async (req, res) => {`;
const newRoute = `router.delete('/remove-directory', async (req, res) => {
  const { path } = req.body;
  try {
    console.log('🗑️ Removing directory from index by path:', path);
    const directories = db.getDirectories();
    const deletedDir = directories.find(d => d.path === path);
    
    if (!deletedDir) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    // Stop watcher first so it doesn't re-add things
    console.log('🛑 Stopping watcher for directory:', deletedDir.path);
    watcher.stopWatcher(deletedDir.path);
    
    // Find all files in this directory and remove them from Qdrant
    if (db.getAllFiles) {
        const allFiles = db.getAllFiles();
        // Handle path separators correctly
        const pathPrefix = path.replace(/\\\\/g, '/').replace(/\\\\/g, '/');
        const filesToRemove = allFiles.filter(f => f.path.replace(/\\\\/g, '/').startsWith(pathPrefix));
        
        console.log(\`🧹 Found \${filesToRemove.length} files to remove from Qdrant...\`);
        for (const f of filesToRemove) {
            try {
                await worker.removeFile(f.path);
                db.removeFile(f.path);
            } catch(e) {
                console.error(\`Failed to remove \${f.path}:\`, e.message);
            }
        }
    }
    
    const result = db.deleteDirectory(deletedDir.id);
    
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Failed to remove directory:', err.message);
    res.status(500).json({ error: 'Failed to delete directory', details: err.message });
  }
});`;

const idx = dirContent.indexOf(oldRoute);
if (idx !== -1) {
    const start = dirContent.substring(0, idx);
    const newContent = start + newRoute + '\n\nmodule.exports = router;\n';
    fs.writeFileSync('src/routes/directories.js', newContent, 'utf8');
    console.log('Patched directories.js');
} else {
    console.log('Could not find old route');
}

const chokidar = require('chokidar');
const worker = require('../lib/workerClient');
const db = require('../db');

const watchers = new Map();

function startWatcher(dirPath, userId = null) {
  // Use a composite key for the watcher map so multiple users can watch the same dir if needed
  const watcherKey = `${dirPath}_${userId}`;
  if (watchers.has(watcherKey)) return;

  const normalizedPath = dirPath.replace(/\\/g, '/');
  const watcher = chokidar.watch(normalizedPath, { 
    persistent: true, 
    ignoreInitial: true, 
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', async path => {
      console.log(`📄 ➕ New file detected for user ${userId}:`, path);
      try {
        const res = await worker.indexFile(path, userId);
        console.log('✅ 🔍 File indexed successfully:', path.split(/[\\/]/).pop());
        db.upsertFile({ path, dir_id: null, checksum: res.data.checksum || null, last_indexed: new Date().toISOString(), status: 'indexed', user_id: userId });
      } catch (e) { 
        console.error('❌ 🔍 File indexing failed:', e.message); 
      }
    })
    .on('change', async path => {
      console.log(`📄 ✏️  File changed for user ${userId}:`, path);
      try {
        const res = await worker.reindexFile(path, userId);
        console.log('✅ 🔄 File reindexed successfully:', path.split(/[\\/]/).pop());
        db.upsertFile({ path, dir_id: null, checksum: res.data.checksum || null, last_indexed: new Date().toISOString(), status: 'indexed', user_id: userId });
      } catch (e) { 
        console.error('❌ 🔄 File reindexing failed:', e.message); 
      }
    })
    .on('unlink', async path => {
      console.log(`📄 🗑️  File deleted for user ${userId}:`, path);
      try {
        await worker.removeFile(path, userId);
        console.log('✅ 🗑️  File removed from index:', path.split(/[\\/]/).pop());
        db.removeFile(path); // DB removeFile might need userId too, but since path is unique per user now, we might need a db.removeFile(path, userId)
      } catch (e) { 
        console.error('❌ 🗑️  File removal failed:', e.message); 
      }
    });

  watchers.set(watcherKey, watcher);
  console.log(`🎯 👀 File watcher activated for: ${dirPath} (User: ${userId})`);
}

function stopWatcher(dirPath, userId = null) {
  const watcherKey = `${dirPath}_${userId}`;
  const w = watchers.get(watcherKey);
  if (w) {
    w.close();
    watchers.delete(watcherKey);
  }
}

function status() {
  return Array.from(watchers.keys());
}

module.exports = { startWatcher, stopWatcher, status };

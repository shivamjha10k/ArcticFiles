const app = require('./app');
const { PORT } = require('./config');
const db = require('./db');
const watcherManager = require('./watcher/watcherManager');

// Print startup banner
console.log('='.repeat(80));
console.log('🚀 ARCTICFILES BACKEND SERVER STARTING...');
console.log('='.repeat(80));

// Initialize watchers for existing directories on server start
function initializeWatchers() {
  const directories = db.listDirectories();
  console.log(`📁 Initializing file watchers for ${directories.length} directories...`);
  
  directories.forEach(dir => {
    try {
      watcherManager.startWatcher(dir.path);
      console.log(`✅ 👀 Watcher started for: ${dir.path}`);
    } catch (error) {
      console.error(`❌ 👀 Failed to start watcher for ${dir.path}:`, error.message);
    }
  });
  
  if (directories.length > 0) {
    console.log('🎯 File watchers are now monitoring for changes...');
    console.log('📝 New files will be automatically indexed');
    console.log('🗑️  Deleted files will be automatically removed from index');
  }
}

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🌟 BACKEND SERVER READY!`);
  console.log(`🌐 Listening on port ${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log('   • GET  /api/directories - List indexed directories');  
  console.log('   • POST /api/set-directory - Add directory to watch');
  console.log('   • POST /api/search - Search through documents');
  console.log('   • GET  /health - Health check');
  console.log('='.repeat(60));
  
  console.log('🔄 Initializing file watchers...');
  initializeWatchers();
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutdown signal received...');
  console.log('🔄 Stopping file watchers...');
  watcherManager.status().forEach(p => {
    watcherManager.stopWatcher(p);
    console.log(`✅ Stopped watcher for: ${p}`);
  });
  console.log('🔄 Shutting down server...');
  server.close(() => {
    console.log('✅ Backend server shutdown complete!');
    process.exit(0);
  });
});

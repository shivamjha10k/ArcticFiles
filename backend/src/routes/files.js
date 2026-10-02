const express = require('express');
const router = express.Router();
const worker = require('../lib/workerClient');
const db = require('../db');

router.post('/index-file', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  try {
    console.log('📄 🔍 Indexing file:', path);
    const { data } = await worker.indexFile(path, userId);
    db.upsertFile({ path, dir_id: null, checksum: data.checksum || null, last_indexed: new Date().toISOString(), status: 'indexed', user_id: userId });
    console.log('✅ 📄 File indexed successfully');
    res.json({ ok: true, result: data });
  } catch (err) {
    console.error('❌ 📄 File indexing failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reindex-file', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  try {
    console.log('🔄 📄 Reindexing file:', path);
    const { data } = await worker.reindexFile(path, userId);
    db.upsertFile({ path, dir_id: null, checksum: data.checksum || null, last_indexed: new Date().toISOString(), status: 'indexed', user_id: userId });
    console.log('✅ 📄 File reindexed successfully');
    res.json({ ok: true, result: data });
  } catch (err) {
    console.error('❌ 📄 File reindexing failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/remove-file', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  try {
    console.log('🗑️ 📄 Removing file from index:', path);
    await worker.removeFile(path, userId);
    db.removeFile(path);
    console.log('✅ File removed successfully');
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Failed to remove file:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/file-content', async (req, res) => {
  const { path } = req.body;
  const userId = req.headers['x-user-id'] || null;
  try {
    const { data } = await worker.getFileContent(path, userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

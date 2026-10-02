const axios = require('axios');
const { WORKER_URL } = require('../config');

const client = axios.create({ baseURL: WORKER_URL, timeout: 60_000 });

// Add request/response interceptors for logging
client.interceptors.request.use(
  (config) => {
    console.log(`🔄 → Worker API: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ → Worker API request error:', error.message);
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => {
    console.log(`✅ ← Worker API: ${response.config.method?.toUpperCase()} ${response.config.url} (${response.status})`);
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || 'REQUEST';
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'no response';
    console.error(`❌ ← Worker API: ${method} ${url} (${status}) - ${error.message}`);
    return Promise.reject(error);
  }
);

module.exports = {
  indexDirectory(path, user_id = null) {
    return client.post('/index-directory', { path, user_id });
  },
  indexFile(path, user_id = null) {
    return client.post('/index-file', { path, user_id });
  },
  reindexFile(path, user_id = null) {
    return client.post('/reindex-file', { path, user_id });
  },
  removeFile(path, user_id = null) {
    return client.delete('/remove-file', { data: { path, user_id } });
  },
  search(query, top_k = 5, user_id = null) {
    return client.post('/search', { query, top_k, user_id });
  },
  preview(path, user_id = null) {
    return client.get('/preview', { params: { path, user_id } });
  },
  ask(question, top_k = 5, user_id = null) {
    return client.post('/ask', { question, top_k, user_id });
  },
  getFileContent(path, user_id = null) {
    return client.post('/file-content', { path, user_id });
  }
};

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  WORKER_URL: process.env.WORKER_URL || 'http://localhost:8081',
  DB_PATH: process.env.DB_PATH || './data/sfe.db',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

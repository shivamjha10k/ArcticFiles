const Database = require('better-sqlite3');
const { DB_PATH } = require('../config');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    added_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    dir_id INTEGER,
    checksum TEXT,
    last_indexed TEXT,
    status TEXT,
    FOREIGN KEY(dir_id) REFERENCES directories(id) ON DELETE CASCADE
  );
`);

console.log('Migration finished.');
db.close();

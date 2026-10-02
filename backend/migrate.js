const Database = require('better-sqlite3');
const db = new Database('./data/sfe.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

console.log("Migrating directories table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS directories_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    added_at TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    UNIQUE(path, user_id)
  );
  INSERT OR IGNORE INTO directories_new (id, path, added_at, user_id) SELECT id, path, added_at, user_id FROM directories;
  DROP TABLE directories;
  ALTER TABLE directories_new RENAME TO directories;
`);

console.log("Migrating files table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS files_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    dir_id INTEGER,
    checksum TEXT,
    last_indexed TEXT,
    status TEXT DEFAULT 'pending',
    user_id INTEGER REFERENCES users(id),
    FOREIGN KEY (dir_id) REFERENCES directories (id),
    UNIQUE(path, user_id)
  );
  INSERT OR IGNORE INTO files_new (id, path, dir_id, checksum, last_indexed, status, user_id) SELECT id, path, dir_id, checksum, last_indexed, status, user_id FROM files;
  DROP TABLE files;
  ALTER TABLE files_new RENAME TO files;
`);

console.log('Done!');

const Database = require('better-sqlite3');
const { DB_PATH } = require('../config');
const db = new Database(DB_PATH);

// Initialize database tables
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS directories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      added_at TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      UNIQUE(path, user_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      dir_id INTEGER,
      checksum TEXT,
      last_indexed TEXT,
      status TEXT DEFAULT 'pending',
      user_id INTEGER REFERENCES users(id),
      FOREIGN KEY (dir_id) REFERENCES directories (id),
      UNIQUE(path, user_id)
    )
  `);

  console.log('✅ 🗃️ Database tables initialized successfully');
}

console.log('🗃️ Initializing SQLite database...');
initializeDatabase();

module.exports = {
  createUser(username, password) {
    try {
      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
      const result = stmt.run(username, password);
      return { id: result.lastInsertRowid, username };
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username already exists');
      }
      throw err;
    }
  },
  getUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },
  addDirectory(path, userId = null) {
    const stmt = db.prepare("INSERT OR IGNORE INTO directories (path, added_at, user_id) VALUES (?, datetime('now'), ?)");
    stmt.run(path, userId);
    return db.prepare('SELECT * FROM directories WHERE path = ?').get(path);
  },
  getDirectories(userId = null) {
    if (userId !== null) {
      return db.prepare('SELECT * FROM directories WHERE user_id = ?').all(userId);
    }
    return db.prepare('SELECT * FROM directories').all();
  },
  listDirectories(userId = null) {
    if (userId !== null) {
      return db.prepare('SELECT * FROM directories WHERE user_id = ?').all(userId);
    }
    return db.prepare('SELECT * FROM directories').all();
  },
  deleteDirectory(id, userId = null) {
    if (userId !== null) {
      return db.prepare('DELETE FROM directories WHERE id = ? AND user_id = ?').run(id, userId);
    }
    return db.prepare('DELETE FROM directories WHERE id = ?').run(id);
  },
  removeDirectory(path) {
    db.prepare('DELETE FROM directories WHERE path = ?').run(path);
  },
  upsertFile(file) {
    const stmt = db.prepare(`
      INSERT INTO files (path, dir_id, checksum, last_indexed, status, user_id)
      VALUES (@path, @dir_id, @checksum, @last_indexed, @status, @user_id)
      ON CONFLICT(path, user_id) DO UPDATE SET 
        checksum=@checksum, last_indexed=@last_indexed, status=@status
    `);
    if (!('user_id' in file)) file.user_id = null;
    stmt.run(file);
  },
  removeFile(path) {
    db.prepare('DELETE FROM files WHERE path = ?').run(path);
  },
  getAllFiles(userId = null) { 
    if (userId !== null) {
      return db.prepare('SELECT * FROM files WHERE user_id = ?').all(userId);
    }
    return db.prepare('SELECT * FROM files').all(); 
  },
  getFile(path) {
    return db.prepare('SELECT * FROM files WHERE path = ?').get(path);
  }
};

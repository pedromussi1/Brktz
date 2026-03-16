const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Store DB inside uploads/ so a single Railway volume covers both
const dataDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'brktz.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );


  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    creator_id INTEGER,
    item_type TEXT DEFAULT 'image',
    category TEXT DEFAULT 'other',
    thumbnail TEXT DEFAULT '',
    shuffle INTEGER DEFAULT 1,
    visibility TEXT DEFAULT 'public',
    allow_comments INTEGER DEFAULT 1,
    plays INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    position INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL,
    quiz_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, quiz_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );
`);

// Migration: add is_admin column if missing (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
} catch (_e) { /* column already exists */ }

module.exports = db;

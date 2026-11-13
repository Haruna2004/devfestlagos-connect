CREATE TABLE users (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  find_me TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  looking_for TEXT NOT NULL DEFAULT '[]',
  links TEXT NOT NULL DEFAULT '{}',
  photo TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  lat REAL,
  lng REAL,
  accuracy REAL,
  seen_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_seen ON users (seen_at);

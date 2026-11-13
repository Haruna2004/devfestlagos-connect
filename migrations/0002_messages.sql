CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX idx_messages_to ON messages (to_id, read_at);
CREATE INDEX idx_messages_from ON messages (from_id, id);

CREATE TABLE blocks (
  blocker TEXT NOT NULL,
  blocked TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker, blocked)
);

CREATE INDEX idx_blocks_blocked ON blocks (blocked);

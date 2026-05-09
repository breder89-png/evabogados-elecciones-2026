CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_facebook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(post_id) REFERENCES posts(id)
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_status ON post_comments(post_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_status_date ON post_comments(status, created_at DESC);

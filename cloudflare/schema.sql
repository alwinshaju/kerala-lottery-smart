CREATE TABLE IF NOT EXISTS draws (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  draw_no TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  published_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS draws_date ON draws(date DESC);

CREATE TABLE IF NOT EXISTS draws (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  draw_no TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  published_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS draws_date ON draws(date DESC);

-- Anonymous usage counts: a random id the app makes for itself. No name, phone, email or ad id.
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  app_version TEXT,
  platform TEXT
);
CREATE TABLE IF NOT EXISTS device_days (
  day TEXT NOT NULL,
  id TEXT NOT NULL,
  PRIMARY KEY (day, id)
);

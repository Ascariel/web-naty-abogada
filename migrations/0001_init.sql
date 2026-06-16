CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip TEXT NOT NULL,
  current_url TEXT,
  created_at INTEGER NOT NULL,
  country TEXT,
  city TEXT,
  region TEXT,
  as_org TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  lang TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type_day ON events(event_type, day);
CREATE INDEX IF NOT EXISTS idx_events_ip ON events(ip);

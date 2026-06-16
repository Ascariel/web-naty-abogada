-- Visit tracking for tranquilidadlegal.cl
-- One row per (non-bot) page view. We store a salted hash of the IP, never the
-- raw IP, so we can still count one unique visitor per IP per day.
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,          -- YYYY-MM-DD in America/Santiago
  ip_hash TEXT NOT NULL,      -- SHA-256(IP_SALT | ip | day)
  path TEXT,                  -- pathname of the page viewed
  created_at INTEGER NOT NULL -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_page_views_day ON page_views(day);

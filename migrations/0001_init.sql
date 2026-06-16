-- Event tracking for tranquilidadlegal.cl
-- One row per (non-bot) event. `event_type` distinguishes page views from
-- interactions (e.g. page_view, whatsapp_btn_click, contact_info_click).
-- We store the raw client IP (from CF-Connecting-IP) for abuse/bot forensics.
-- Unique counts are "one per IP per day" → COUNT(DISTINCT ip || day).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,          -- YYYY-MM-DD in America/Santiago
  event_type TEXT NOT NULL,   -- page_view | whatsapp_btn_click | contact_info_click | ...
  ip TEXT NOT NULL,           -- raw client IP (CF-Connecting-IP)
  path TEXT,                  -- page path, or the clicked link's href
  created_at INTEGER NOT NULL -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type_day ON events(event_type, day);
CREATE INDEX IF NOT EXISTS idx_events_ip ON events(ip);

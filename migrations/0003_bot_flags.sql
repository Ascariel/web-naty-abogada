ALTER TABLE events ADD COLUMN is_bot INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN bot_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_events_bot_day ON events(is_bot, day);

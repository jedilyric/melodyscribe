-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS songs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('keyboard', 'upload')),
  key             TEXT NOT NULL DEFAULT 'C',
  tempo           INTEGER NOT NULL DEFAULT 120,
  time_signature  TEXT NOT NULL DEFAULT '4/4',
  measures        JSONB NOT NULL DEFAULT '[]',
  lyrics          TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS songs_user_id_idx ON songs(user_id);
CREATE INDEX IF NOT EXISTS songs_type_idx ON songs(type);
CREATE INDEX IF NOT EXISTS songs_created_at_idx ON songs(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

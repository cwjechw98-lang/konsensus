-- Add is_public flag to disputes
-- Public disputes are visible to anyone (including anonymous users) in the feed

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL;

-- Index for feed queries (public disputes ordered by updated_at)
CREATE INDEX IF NOT EXISTS idx_disputes_public ON disputes(is_public, updated_at DESC)
  WHERE is_public = true;

-- RLS: anyone (including anon) can read public disputes
CREATE POLICY "Anyone can read public disputes"
  ON disputes FOR SELECT
  USING (is_public = true);

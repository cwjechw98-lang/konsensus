-- ============================================================
-- Migration: Waiting Insights + Resolutions RLS
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. waiting_insights: AI coaching shown to submitter while waiting for opponent
--    Generated immediately after a participant submits their argument
--    before the opponent responds — private to the recipient
CREATE TABLE IF NOT EXISTS waiting_insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  round        INTEGER NOT NULL,
  recipient_id UUID NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, round, recipient_id)
);

ALTER TABLE waiting_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own waiting insights"
  ON waiting_insights FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_waiting_insights_dispute_recipient
  ON waiting_insights(dispute_id, recipient_id);

-- 2. RLS for resolutions table (allow participants to read their dispute's resolutions)
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read resolutions"
  ON resolutions FOR SELECT
  USING (
    dispute_id IN (
      SELECT id FROM disputes
      WHERE creator_id = auth.uid() OR opponent_id = auth.uid()
    )
  );

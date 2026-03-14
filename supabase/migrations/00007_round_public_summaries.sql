-- Public AI round summary: visible to both participants after each completed round
CREATE TABLE IF NOT EXISTS round_public_summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  round         INT NOT NULL,
  content       TEXT NOT NULL,
  convergence   INT DEFAULT 0 CHECK (convergence BETWEEN -2 AND 2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, round)
);

ALTER TABLE round_public_summaries ENABLE ROW LEVEL SECURITY;

-- Participants and observers of public disputes can read summaries
CREATE POLICY "Participants can read round summaries"
  ON round_public_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_id
        AND (
          d.creator_id = auth.uid()
          OR d.opponent_id = auth.uid()
          OR d.is_public = true
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_public_summaries_dispute ON round_public_summaries(dispute_id, round);

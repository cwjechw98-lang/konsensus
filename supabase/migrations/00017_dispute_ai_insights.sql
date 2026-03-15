CREATE TABLE IF NOT EXISTS dispute_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE UNIQUE,
  plane TEXT NOT NULL DEFAULT 'general',
  tone_level INTEGER NOT NULL DEFAULT 3,
  heat_level INTEGER NOT NULL DEFAULT 3,
  core_tension TEXT,
  plane_prompt TEXT,
  patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS round_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, round, recipient_id)
);

CREATE TABLE IF NOT EXISTS waiting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, round, recipient_id)
);

ALTER TABLE dispute_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read dispute_analysis" ON dispute_analysis;
CREATE POLICY "Participants can read dispute_analysis"
  ON dispute_analysis FOR SELECT
  USING (
    dispute_id IN (
      SELECT id FROM disputes
      WHERE creator_id = auth.uid() OR opponent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see only their own insights" ON round_insights;
CREATE POLICY "Users see only their own insights"
  ON round_insights FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users see only their own waiting insights" ON waiting_insights;
CREATE POLICY "Users see only their own waiting insights"
  ON waiting_insights FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_dispute_analysis_dispute
  ON dispute_analysis(dispute_id);

CREATE INDEX IF NOT EXISTS idx_round_insights_dispute_recipient
  ON round_insights(dispute_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_waiting_insights_dispute_recipient
  ON waiting_insights(dispute_id, recipient_id);

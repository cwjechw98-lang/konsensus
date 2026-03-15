CREATE TABLE IF NOT EXISTS dispute_user_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dispute_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dispute_user_state_user_archived
  ON dispute_user_state(user_id, is_archived, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_user_state_dispute
  ON dispute_user_state(dispute_id);

ALTER TABLE dispute_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their dispute user state" ON dispute_user_state;
CREATE POLICY "Users can read their dispute user state"
  ON dispute_user_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their dispute user state" ON dispute_user_state;
CREATE POLICY "Users can insert their dispute user state"
  ON dispute_user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their dispute user state" ON dispute_user_state;
CREATE POLICY "Users can update their dispute user state"
  ON dispute_user_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their dispute user state" ON dispute_user_state;
CREATE POLICY "Users can delete their dispute user state"
  ON dispute_user_state FOR DELETE
  USING (auth.uid() = user_id);

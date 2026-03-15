CREATE TABLE IF NOT EXISTS user_unique_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_unique_achievements_user_id
  ON user_unique_achievements(user_id, created_at DESC);

ALTER TABLE user_unique_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own unique achievements" ON user_unique_achievements
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "service role manages unique achievements" ON user_unique_achievements
  FOR ALL USING (true) WITH CHECK (true);

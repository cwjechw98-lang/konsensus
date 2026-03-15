CREATE TABLE IF NOT EXISTS challenge_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_in_telegram BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS challenge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round INT NOT NULL CHECK (round >= 1),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 280),
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_observer_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  round INT NOT NULL CHECK (round >= 1),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, round)
);

ALTER TABLE challenge_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_observer_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read live challenges" ON challenges
  FOR SELECT USING (
    status IN ('active', 'closed')
    OR status = 'open'
    OR author_id = (SELECT auth.uid())
    OR accepted_by = (SELECT auth.uid())
  );

CREATE POLICY "read active challenge messages" ON challenge_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM challenges c
      WHERE c.id = challenge_id
        AND (
          c.status IN ('active', 'closed')
          OR c.author_id = (SELECT auth.uid())
          OR c.accepted_by = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "read challenge comments" ON challenge_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM challenges c
      WHERE c.id = challenge_id
        AND c.status IN ('active', 'closed')
    )
  );

CREATE POLICY "insert challenge comments" ON challenge_comments
  FOR INSERT WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM challenges c
      WHERE c.id = challenge_id
        AND c.status IN ('active', 'closed')
    )
  );

CREATE POLICY "manage own challenge watchers" ON challenge_watchers
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "read own challenge opinions" ON challenge_opinions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "insert own challenge opinions" ON challenge_opinions
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM challenges c
      WHERE c.id = challenge_id
        AND c.status = 'active'
    )
  );

CREATE POLICY "read participant observer hints" ON challenge_observer_hints
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM challenges c
      WHERE c.id = challenge_id
        AND (
          c.author_id = (SELECT auth.uid())
          OR c.accepted_by = (SELECT auth.uid())
        )
    )
  );

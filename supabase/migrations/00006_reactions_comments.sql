-- Emoji reactions on disputes
CREATE TABLE dispute_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (emoji IN ('👍','👎','🤔','🔥','💯')),
  session_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, emoji, session_id)
);

ALTER TABLE dispute_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON dispute_reactions FOR SELECT USING (true);

CREATE INDEX idx_reactions_dispute ON dispute_reactions(dispute_id);

-- Observer chat on public disputes
CREATE TABLE dispute_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  author_name TEXT NOT NULL,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_ai       BOOLEAN DEFAULT false NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dispute_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments on public disputes"
  ON dispute_comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM disputes WHERE id = dispute_id AND is_public = true)
  );

CREATE INDEX idx_comments_dispute ON dispute_comments(dispute_id, created_at);

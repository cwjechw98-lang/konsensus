-- Добавить поля в profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT CHECK (length(bio) <= 500),
  ADD COLUMN IF NOT EXISTS debate_stance TEXT CHECK (length(debate_stance) <= 200);

-- Таблица вызовов
CREATE TABLE IF NOT EXISTS challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL CHECK (length(topic) BETWEEN 5 AND 200),
  position_hint TEXT NOT NULL CHECK (length(position_hint) BETWEEN 10 AND 400),
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','active','closed')),
  accepted_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
);

-- Сообщения в чате вызова
CREATE TABLE IF NOT EXISTS challenge_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES profiles(id),
  content      TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_ai        BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_messages ENABLE ROW LEVEL SECURITY;

-- Все видят открытые вызовы
CREATE POLICY "read open challenges" ON challenges
  FOR SELECT USING (status = 'open' OR author_id = (SELECT auth.uid()) OR accepted_by = (SELECT auth.uid()));

-- Только авторизованные создают
CREATE POLICY "create challenge" ON challenges
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Автор и принявший могут обновлять статус
CREATE POLICY "update challenge" ON challenges
  FOR UPDATE USING (author_id = (SELECT auth.uid()) OR accepted_by = (SELECT auth.uid()));

-- Сообщения видят только участники
CREATE POLICY "read challenge messages" ON challenge_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenges c WHERE c.id = challenge_id
      AND (c.author_id = (SELECT auth.uid()) OR c.accepted_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY "insert challenge messages" ON challenge_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenges c WHERE c.id = challenge_id
      AND (c.author_id = (SELECT auth.uid()) OR c.accepted_by = (SELECT auth.uid()))
    )
  );

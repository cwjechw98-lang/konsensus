-- =============================================
-- Миграция: оркестратор + персональные инсайты
-- Запустить в Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Оркестратор: одна запись на спор
--    Типизация, тон, суть конфликта, промпт для плоскости
--    Это накопительная база знаний платформы (датасет)
CREATE TABLE IF NOT EXISTS dispute_analysis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID REFERENCES disputes(id) ON DELETE CASCADE UNIQUE,
  plane         TEXT NOT NULL DEFAULT 'general',
  -- casual | legal | family | scientific | religious | business | political | general
  tone_level    INTEGER NOT NULL DEFAULT 3,
  -- 1 = шуточный, 2 = дружеский, 3 = нейтральный, 4 = серьёзный, 5 = формальный
  core_tension  TEXT,
  -- суть непримиримости: что именно делает стороны глухими друг к другу
  plane_prompt  TEXT,
  -- системный промпт, который ИИ сгенерировал для этой плоскости (для обучения)
  patterns      JSONB DEFAULT '{}',
  -- что сработало, что нет — накапливается, станет датасетом
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Персональные инсайты: 2 записи на раунд (по одной на каждого участника)
--    Каждый видит ТОЛЬКО свой инсайт
CREATE TABLE IF NOT EXISTS round_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID REFERENCES disputes(id) ON DELETE CASCADE,
  round         INTEGER NOT NULL,
  recipient_id  UUID NOT NULL,
  -- кому адресован комментарий (user_id)
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, round, recipient_id)
);

-- RLS: dispute_analysis видят только участники спора
ALTER TABLE dispute_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read dispute_analysis"
  ON dispute_analysis FOR SELECT
  USING (
    dispute_id IN (
      SELECT id FROM disputes
      WHERE creator_id = auth.uid() OR opponent_id = auth.uid()
    )
  );

-- RLS: round_insights видит ТОЛЬКО получатель (ключевой момент!)
ALTER TABLE round_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own insights"
  ON round_insights FOR SELECT
  USING (auth.uid() = recipient_id);

-- Индексы для быстрой выборки
CREATE INDEX IF NOT EXISTS idx_round_insights_dispute_recipient
  ON round_insights(dispute_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_dispute_analysis_dispute
  ON dispute_analysis(dispute_id);

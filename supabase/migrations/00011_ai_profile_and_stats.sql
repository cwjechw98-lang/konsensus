-- ИИ-профиль пользователя (внутренний, формируется автоматически)
CREATE TABLE IF NOT EXISTS user_ai_profiles (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Стиль аргументации: emotional / logical / mixed
  argumentation_style TEXT DEFAULT 'mixed',
  -- Склонность к компромиссу: 0-100
  compromise_tendency INTEGER DEFAULT 50,
  -- Реакция на подсказки ИИ: accepts / ignores / argues
  ai_hint_reaction TEXT DEFAULT 'accepts',
  -- Типичные плоскости споров (массив категорий)
  typical_planes TEXT[] DEFAULT '{}',
  -- Частота консенсуса: 0-100%
  consensus_rate INTEGER DEFAULT 0,
  -- Средняя скорость ответа (секунды)
  avg_response_time INTEGER DEFAULT 0,
  -- Импульсивность: 0-100 (0=обдумывающий, 100=импульсивный)
  impulsivity INTEGER DEFAULT 50,
  -- Эмпатия: 0-100
  empathy_score INTEGER DEFAULT 50,
  -- ИИ-резюме (текстовое, генерируется после каждого спора)
  ai_summary TEXT,
  -- Счётчики для аналитики
  hints_accepted INTEGER DEFAULT 0,
  hints_ignored INTEGER DEFAULT 0,
  hints_total INTEGER DEFAULT 0,
  -- Обновляется при каждом споре
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_ai_profiles ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свой ИИ-профиль
CREATE POLICY "users read own ai profile" ON user_ai_profiles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Service role может всё
CREATE POLICY "service role manages ai profiles" ON user_ai_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Таблица контрагентов (кэш отношений между пользователями)
CREATE TABLE IF NOT EXISTS user_counterparts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  counterpart_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dispute_count INTEGER DEFAULT 1,
  consensus_count INTEGER DEFAULT 0,
  last_dispute_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, counterpart_id)
);

ALTER TABLE user_counterparts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own counterparts" ON user_counterparts
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "service role manages counterparts" ON user_counterparts
  FOR ALL USING (true) WITH CHECK (true);

-- Логирование эффективности подсказок ИИ
CREATE TABLE IF NOT EXISTS ai_hint_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round       INTEGER NOT NULL,
  hint_text   TEXT NOT NULL,
  -- Изменил ли пользователь тон после подсказки (определяется ИИ)
  tone_changed BOOLEAN,
  -- Позиции сблизились? (определяется ИИ)
  positions_converged BOOLEAN,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_hint_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hint logs" ON ai_hint_logs
  FOR ALL USING (true) WITH CHECK (true);

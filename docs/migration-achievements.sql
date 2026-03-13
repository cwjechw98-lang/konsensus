-- ============================================================
-- Migration: User Points + Achievements System
-- Run in Supabase SQL Editor
-- ============================================================

-- user_points: одна строка на пользователя, хранит суммарные очки
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_achievements: каждое полученное достижение — отдельная строка
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- RLS: пользователи видят только свои записи
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- user_points policies
CREATE POLICY "users_read_own_points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_all_points"
  ON public.user_points FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_achievements policies
CREATE POLICY "users_read_own_achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_all_achievements"
  ON public.user_achievements FOR ALL
  USING (true)
  WITH CHECK (true);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON public.user_achievements(earned_at DESC);

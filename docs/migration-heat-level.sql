-- ============================================================
-- Migration: Heat Level (Tension Meter) in dispute_analysis
-- Run in Supabase SQL Editor
-- ============================================================

-- Добавляем уровень накала спора (1-5) в таблицу анализа
ALTER TABLE public.dispute_analysis
  ADD COLUMN IF NOT EXISTS heat_level INTEGER NOT NULL DEFAULT 3
  CHECK (heat_level BETWEEN 1 AND 5);

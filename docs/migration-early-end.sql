-- ============================================================
-- Migration: Early Termination Proposal
-- Run in Supabase SQL Editor
-- ============================================================

-- Добавляем колонку для предложения досрочного завершения спора
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS early_end_proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Индекс не нужен — поле используется только в контексте конкретного спора

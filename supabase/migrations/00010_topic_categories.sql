-- Категории тем для споров и вызовов
-- ИИ автоматически определяет категорию при создании

ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
    'politics', 'technology', 'philosophy', 'lifestyle',
    'science', 'culture', 'economics', 'relationships', 'other'
  ));

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
    'politics', 'technology', 'philosophy', 'lifestyle',
    'science', 'culture', 'economics', 'relationships', 'other'
  ));

-- Поле для хранения последних message_id бота (для автоочистки чата)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_bot_messages JSONB DEFAULT '[]'::jsonb;

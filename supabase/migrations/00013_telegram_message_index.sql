ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_message_index JSONB DEFAULT '{}'::jsonb;

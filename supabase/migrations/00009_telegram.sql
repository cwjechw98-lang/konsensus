ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_link_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx
  ON profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_link_token_idx
  ON profiles(telegram_link_token) WHERE telegram_link_token IS NOT NULL;

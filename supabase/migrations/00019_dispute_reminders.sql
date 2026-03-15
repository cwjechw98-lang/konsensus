ALTER TABLE dispute_user_state
  ADD COLUMN IF NOT EXISTS pending_reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rearchived_after_reminder_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dispute_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_via_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  suppressed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_dispute_reminders_to_user_recent
  ON dispute_reminders(dispute_id, to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_reminders_from_user_recent
  ON dispute_reminders(dispute_id, from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_user_state_archive_priority
  ON dispute_user_state(user_id, is_archived, pending_reminder_count DESC, last_reminded_at DESC, updated_at DESC);

ALTER TABLE dispute_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read dispute reminders" ON dispute_reminders;
CREATE POLICY "Participants read dispute reminders"
  ON dispute_reminders FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users create outgoing dispute reminders" ON dispute_reminders;
CREATE POLICY "Users create outgoing dispute reminders"
  ON dispute_reminders FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

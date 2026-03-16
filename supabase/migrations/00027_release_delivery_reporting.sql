alter table public.release_announcements
  add column if not exists bot_recipient_count integer not null default 0,
  add column if not exists bot_delivered_count integer not null default 0,
  add column if not exists bot_suppressed_count integer not null default 0,
  add column if not exists channel_message_id bigint null,
  add column if not exists last_delivery_attempt_at timestamptz null;

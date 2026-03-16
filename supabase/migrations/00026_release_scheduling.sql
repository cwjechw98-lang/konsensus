alter table public.release_announcements
  add column if not exists scheduled_publish_at timestamptz null,
  add column if not exists scheduled_target text null
    check (scheduled_target in ('bot', 'channel', 'both')),
  add column if not exists scheduled_published_at timestamptz null,
  add column if not exists last_schedule_attempt_at timestamptz null,
  add column if not exists last_schedule_error text null;

create index if not exists release_announcements_schedule_idx
  on public.release_announcements(scheduled_publish_at asc)
  where scheduled_publish_at is not null and scheduled_published_at is null;

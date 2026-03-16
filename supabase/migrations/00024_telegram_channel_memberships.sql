create table if not exists public.telegram_channel_memberships (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  telegram_user_id text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  membership_status text not null default 'unknown'
    check (membership_status in ('creator', 'administrator', 'member', 'restricted', 'left', 'kicked', 'unknown')),
  is_member boolean not null default false,
  checked_via text not null default 'api'
    check (checked_via in ('api', 'webhook')),
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id, telegram_user_id)
);

create index if not exists telegram_channel_memberships_profile_idx
  on public.telegram_channel_memberships(profile_id);

create index if not exists telegram_channel_memberships_channel_member_idx
  on public.telegram_channel_memberships(channel_id, is_member, last_checked_at desc);

alter table public.telegram_channel_memberships enable row level security;

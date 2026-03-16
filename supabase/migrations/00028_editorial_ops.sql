create table if not exists public.editorial_release_cursor (
  id uuid primary key default gen_random_uuid(),
  scope text not null unique default 'telegram_release',
  last_published_commit text null,
  last_published_release_slug text null,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_release_drafts (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'telegram_release',
  from_commit text null,
  to_commit text not null,
  commit_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'cancelled')),
  title text null,
  summary text null,
  features text[] not null default '{}',
  notes text null,
  target text null
    check (target in ('bot', 'channel', 'both')),
  schedule_at timestamptz null,
  source_commits text[] not null default '{}',
  source_status_lines text[] not null default '{}',
  generation_context jsonb not null default '{}'::jsonb,
  published_release_slug text null,
  created_by uuid not null references auth.users(id) on delete cascade,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_release_drafts_scope_status_idx
  on public.editorial_release_drafts(scope, status, created_at desc);

create index if not exists editorial_release_drafts_to_commit_idx
  on public.editorial_release_drafts(to_commit);

alter table public.editorial_release_cursor enable row level security;
alter table public.editorial_release_drafts enable row level security;

create table if not exists public.profile_quest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_key text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_step integer not null default 0,
  responses jsonb not null default '[]'::jsonb,
  result_delta jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_quest_runs_user_idx
  on public.profile_quest_runs(user_id, created_at desc);

create index if not exists profile_quest_runs_user_quest_idx
  on public.profile_quest_runs(user_id, quest_key, status);

alter table public.profile_quest_runs enable row level security;

drop policy if exists "users read own profile quest runs" on public.profile_quest_runs;
create policy "users read own profile quest runs"
  on public.profile_quest_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own profile quest runs" on public.profile_quest_runs;
create policy "users insert own profile quest runs"
  on public.profile_quest_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own profile quest runs" on public.profile_quest_runs;
create policy "users update own profile quest runs"
  on public.profile_quest_runs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

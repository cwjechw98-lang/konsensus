create table if not exists public.user_learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_slug text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, material_slug)
);

create index if not exists idx_user_learning_progress_user
  on public.user_learning_progress(user_id, completed_at desc nulls last);

create index if not exists idx_user_learning_progress_material
  on public.user_learning_progress(material_slug);

alter table public.user_learning_progress enable row level security;

drop policy if exists "users read own learning progress" on public.user_learning_progress;
drop policy if exists "users insert own learning progress" on public.user_learning_progress;
drop policy if exists "users update own learning progress" on public.user_learning_progress;

create policy "users read own learning progress"
  on public.user_learning_progress
  for select
  using (auth.uid() = user_id);

create policy "users insert own learning progress"
  on public.user_learning_progress
  for insert
  with check (auth.uid() = user_id);

create policy "users update own learning progress"
  on public.user_learning_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('ai_summary', 'reputation_badge')),
  item_key text not null,
  item_label text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  appeal_text text not null,
  status text not null default 'reviewing' check (status in ('reviewing', 'resolved')),
  review_result text null check (review_result in ('kept', 'hidden')),
  review_confidence integer null check (review_confidence between 0 and 100),
  review_notes text null,
  reviewed_at timestamptz null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appeals_user_created_idx
  on public.appeals(user_id, created_at desc);

create index if not exists appeals_item_idx
  on public.appeals(user_id, item_type, item_key, created_at desc);

alter table public.appeals enable row level security;

drop policy if exists "users read own appeals" on public.appeals;
create policy "users read own appeals"
  on public.appeals
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users create own appeals" on public.appeals;
create policy "users create own appeals"
  on public.appeals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

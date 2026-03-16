alter table public.appeals
  add column if not exists manual_override_result text null
    check (manual_override_result in ('kept', 'hidden')),
  add column if not exists manual_override_notes text null,
  add column if not exists manual_overridden_at timestamptz null,
  add column if not exists manual_overridden_by uuid null references auth.users(id) on delete set null;

create index if not exists appeals_manual_override_idx
  on public.appeals(manual_overridden_at desc, review_result, review_confidence);

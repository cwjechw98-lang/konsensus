alter table public.profiles
  add column if not exists trust_tier text not null default 'basic';

update public.profiles
set trust_tier = 'basic'
where trust_tier is null;

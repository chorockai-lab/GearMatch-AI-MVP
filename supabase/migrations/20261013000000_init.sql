-- GearMatch AI v2.0 — STEP 3 schema (onboarding · runs · events)
-- Users: Supabase Anonymous Auth (auth.users, role "authenticated", is_anonymous = true).
--   Same-browser use only; no cross-browser recovery in MVP.
-- Every user-owned table is protected by RLS: a user can only read/write rows where user_id = auth.uid().
-- user_id defaults to auth.uid(), so clients never send it; RLS rejects any other value.
-- ITEMS tables (products, seed_runners, seed_runner_shoes, saved_products) come in STEP 4 once the shoe data is known.

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Animal Identity result (spec §4.5) — one row per user ────────────────────
create table if not exists public.identity_results (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  animal_type_v2 text not null check (animal_type_v2 in ('HAM','CHE','HOR','GOA','FOX','WOL','OTT','CAT')),
  secondary_type_v2 text not null check (secondary_type_v2 in ('HAM','CHE','HOR','GOA','FOX','WOL','OTT','CAT')),
  test_answers_v2 text not null check (test_answers_v2 ~ '^[A-E]{5}$'),
  test_schema_version text not null default 'animal-v2.0.0',
  scoring_version text not null default 'animal-score-0.1',
  mixed_signal boolean not null default false,
  evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Runner Profile + Current Shoe — one row per user ────────────────────────
create table if not exists public.runner_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  experience text check (char_length(experience) <= 20),
  runs_per_week text check (char_length(runs_per_week) <= 20),
  typical_run_distance text check (char_length(typical_run_distance) <= 20),
  weekly_distance text check (char_length(weekly_distance) <= 20),
  height_cm numeric(5,1) check (height_cm between 50 and 260),
  weight_kg numeric(5,1) check (weight_kg between 15 and 300),
  shoe_size_mm numeric(5,1) check (shoe_size_mm between 150 and 400),
  interest_distance text check (char_length(interest_distance) <= 20),
  current_shoe_label text check (char_length(current_shoe_label) <= 80),
  current_shoe_status text check (current_shoe_status in ('known','unknown','none')),
  onboarding_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Runs — date · distance · time · shoe snapshot (pace is derived, never stored) ──
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_date date not null check (run_date >= date '2000-01-01'),
  distance_km numeric(6,2) not null check (distance_km > 0 and distance_km <= 300),
  duration_sec integer not null check (duration_sec > 0 and duration_sec < 172800),
  shoe_label text check (char_length(shoe_label) <= 80), -- snapshot; not changed when the current shoe changes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists runs_user_date on public.runs (user_id, run_date desc, created_at desc);

-- ── Product events (success metrics: test start/complete, reveal, card done, first run, revisit, ITEMS) ──
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,47}$'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048),
  path text check (char_length(path) <= 200),
  client_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists events_user_created on public.events (user_id, created_at desc);
create index if not exists events_name_created on public.events (name, created_at desc);

-- ── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists identity_results_updated on public.identity_results;
create trigger identity_results_updated before update on public.identity_results for each row execute function public.set_updated_at();
drop trigger if exists runner_profiles_updated on public.runner_profiles;
create trigger runner_profiles_updated before update on public.runner_profiles for each row execute function public.set_updated_at();
drop trigger if exists runs_updated on public.runs;
create trigger runs_updated before update on public.runs for each row execute function public.set_updated_at();

-- ── privileges: nothing for anon (signed-out), CRUD for signed-in incl. anonymous users ──
revoke all on public.identity_results, public.runner_profiles, public.runs, public.events from anon;
grant select, insert, update, delete on public.identity_results, public.runner_profiles, public.runs to authenticated;
grant select, insert on public.events to authenticated; -- events are append-only

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.identity_results enable row level security;
alter table public.runner_profiles enable row level security;
alter table public.runs enable row level security;
alter table public.events enable row level security;

drop policy if exists "identity: select own" on public.identity_results;
drop policy if exists "identity: insert own" on public.identity_results;
drop policy if exists "identity: update own" on public.identity_results;
drop policy if exists "identity: delete own" on public.identity_results;
create policy "identity: select own" on public.identity_results for select to authenticated using (user_id = (select auth.uid()));
create policy "identity: insert own" on public.identity_results for insert to authenticated with check (user_id = (select auth.uid()));
create policy "identity: update own" on public.identity_results for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "identity: delete own" on public.identity_results for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "profile: select own" on public.runner_profiles;
drop policy if exists "profile: insert own" on public.runner_profiles;
drop policy if exists "profile: update own" on public.runner_profiles;
drop policy if exists "profile: delete own" on public.runner_profiles;
create policy "profile: select own" on public.runner_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profile: insert own" on public.runner_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profile: update own" on public.runner_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profile: delete own" on public.runner_profiles for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "runs: select own" on public.runs;
drop policy if exists "runs: insert own" on public.runs;
drop policy if exists "runs: update own" on public.runs;
drop policy if exists "runs: delete own" on public.runs;
create policy "runs: select own" on public.runs for select to authenticated using (user_id = (select auth.uid()));
create policy "runs: insert own" on public.runs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "runs: update own" on public.runs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "runs: delete own" on public.runs for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "events: select own" on public.events;
drop policy if exists "events: insert own" on public.events;
create policy "events: select own" on public.events for select to authenticated using (user_id = (select auth.uid()));
create policy "events: insert own" on public.events for insert to authenticated with check (user_id = (select auth.uid()));

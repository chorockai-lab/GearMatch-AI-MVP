-- GearMatch AI v2.0 — initial schema  ·  DRAFT for STEP 3 (NOT applied anywhere yet)
-- Users: Supabase Anonymous Auth (auth.users). Same-browser use only; no cross-browser recovery in MVP.
-- Every user-owned table is protected by RLS: a user can only read/write rows where user_id = auth.uid().

create table if not exists public.identity_results (
  user_id uuid primary key references auth.users(id) on delete cascade,
  animal_type_v2 text not null check (animal_type_v2 in ('HAM','CHE','HOR','GOA','FOX','WOL','OTT','CAT')),
  secondary_type_v2 text not null check (secondary_type_v2 in ('HAM','CHE','HOR','GOA','FOX','WOL','OTT','CAT')),
  test_answers_v2 text not null check (test_answers_v2 ~ '^[A-E]{5}$'),
  test_schema_version text not null default 'animal-v2.0.0',
  scoring_version text not null default 'animal-score-0.1',
  mixed_signal boolean not null default false,
  evaluated_at timestamptz not null default now()
);

create table if not exists public.runner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience text, runs_per_week text, typical_run_distance text, weekly_distance text,
  height_cm numeric, weight_kg numeric, shoe_size_mm numeric, interest_distance text,
  current_shoe_label text,          -- brand + model text, or null
  current_shoe_status text check (current_shoe_status in ('known','unknown','none')),
  updated_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null,
  distance_km numeric(6,2) not null check (distance_km > 0 and distance_km <= 300),
  duration_sec integer not null check (duration_sec > 0 and duration_sec < 172800),
  shoe_label text,                  -- snapshot; not changed when the current shoe changes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists runs_user_date on public.runs (user_id, run_date desc, created_at desc);

-- Test/seed data for ITEMS (admin-entered). is_test separates it from any real data.
create table if not exists public.products (
  id text primary key, brand text not null, model text not null, tags text[] default '{}',
  image_url text, image_license_type text, commercial_use_allowed boolean default false,
  is_test boolean not null default true
);
create table if not exists public.seed_runners (
  id text primary key, height_cm numeric, weight_kg numeric, shoe_size_mm numeric,
  typical_run_distance text, weekly_distance text, is_test boolean not null default true
);
create table if not exists public.seed_runner_shoes (
  runner_id text references public.seed_runners(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  primary key (runner_id, product_id)
);

create table if not exists public.saved_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  source text check (source in ('similar_runner','explore_items','recommendation','other')),
  saved_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.identity_results enable row level security;
alter table public.runner_profiles enable row level security;
alter table public.runs enable row level security;
alter table public.saved_products enable row level security;
alter table public.products enable row level security;
alter table public.seed_runners enable row level security;
alter table public.seed_runner_shoes enable row level security;

create policy "own identity" on public.identity_results for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile"  on public.runner_profiles  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own runs"     on public.runs             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved"    on public.saved_products   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- catalogue + seed data: read-only for signed-in (incl. anonymous) users; writes only via service role / SQL editor
create policy "read products"     on public.products          for select using (auth.role() = 'authenticated');
create policy "read seed runners" on public.seed_runners      for select using (auth.role() = 'authenticated');
create policy "read seed shoes"   on public.seed_runner_shoes for select using (auth.role() = 'authenticated');

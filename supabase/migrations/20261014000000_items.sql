-- GearMatch AI v2.0 — STEP 4 ITEMS schema
--   products            : running-shoe catalogue (readable by signed-in users)
--   seed_runners        : sample runners (body data) — NOT readable by clients; only aggregated by runners_like_you()
--   seed_runner_shoes   : which sample runner uses which product
--   saved_products      : a user's saved shoes (RLS: own rows only)
-- Policy (2026-10-13): base ±5cm / ±5kg / ±10mm + same usual-distance bucket; wide ±10 / ±10 / ±20 only when the user asks;
-- fewer than 5 similar runners → no product list. Animal type is never used. Counts are distinct runners from stored rows.
-- DEMO sample runners are for local testing only and must not be loaded into the production project.

-- ── catalogue ───────────────────────────────────────────────────────────────
create table if not exists public.products (
  id text primary key check (id ~ '^[A-Z0-9][A-Z0-9_-]{2,79}$'),
  brand text not null check (char_length(brand) between 1 and 40),
  brand_ko text check (char_length(brand_ko) <= 40),
  model_name text not null check (char_length(model_name) between 1 and 80),
  display_name text not null check (char_length(display_name) between 1 and 120),
  primary_use text check (char_length(primary_use) <= 20),
  tags text[] not null default '{}',
  official_url text check (official_url ~ '^https://'),
  -- an image is shown only when its use is approved; otherwise the design-system placeholder is used
  image_url text check (image_url ~ '^https://'),
  image_approved boolean not null default false,
  active boolean not null default true,
  data_source text not null default 'catalog' check (data_source in ('catalog', 'demo')),
  updated_at timestamptz not null default now()
);

-- ── sample runners (never exposed row-by-row) ──────────────────────────────
create table if not exists public.seed_runners (
  id text primary key check (char_length(id) between 1 and 40),
  height_cm numeric(5,1) not null check (height_cm between 100 and 230),
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 200),
  shoe_size_mm numeric(5,1) not null check (shoe_size_mm between 200 and 330),
  typical_run_distance text not null check (typical_run_distance in ('LT_3', 'D3_5', 'D5_10', 'GTE_10')),
  weekly_distance text check (weekly_distance in ('LT_5', 'D5_15', 'D15_30', 'GTE_30', 'UNKNOWN')),
  data_source text not null check (data_source in ('survey', 'partner', 'internal', 'demo')),
  created_at timestamptz not null default now()
);

create table if not exists public.seed_runner_shoes (
  runner_id text not null references public.seed_runners(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  run_count integer check (run_count >= 0),
  total_km numeric(8,1) check (total_km >= 0),
  primary key (runner_id, product_id)
);
create index if not exists seed_runner_shoes_product on public.seed_runner_shoes (product_id);

-- ── saved shoes ─────────────────────────────────────────────────────────────
create table if not exists public.saved_products (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

drop trigger if exists products_updated on public.products;
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

-- ── privileges ──────────────────────────────────────────────────────────────
revoke all on public.products, public.seed_runners, public.seed_runner_shoes, public.saved_products from anon;
revoke all on public.seed_runners, public.seed_runner_shoes from authenticated;
grant select on public.products to authenticated;
grant select, insert, delete on public.saved_products to authenticated;

alter table public.products enable row level security;
alter table public.seed_runners enable row level security;      -- no policies: clients cannot read sample runners
alter table public.seed_runner_shoes enable row level security; -- no policies: clients cannot read sample mappings
alter table public.saved_products enable row level security;

drop policy if exists "products: read active" on public.products;
create policy "products: read active" on public.products for select to authenticated using (active);

drop policy if exists "saved: select own" on public.saved_products;
drop policy if exists "saved: insert own" on public.saved_products;
drop policy if exists "saved: delete own" on public.saved_products;
create policy "saved: select own" on public.saved_products for select to authenticated using (user_id = (select auth.uid()));
create policy "saved: insert own" on public.saved_products for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved: delete own" on public.saved_products for delete to authenticated using (user_id = (select auth.uid()));

-- ── Runners Like You — aggregate only ───────────────────────────────────────
-- Reads the CALLER's own runner_profiles row (auth.uid()) and returns counts only — never sample runners' rows.
-- status: ok | insufficient (similar runners < 5, no products returned) | profile_missing (height/weight/foot/usual distance not entered)
create or replace function public.runners_like_you(p_wide boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.runner_profiles%rowtype;
  d_h numeric := case when p_wide then 10 else 5 end;
  d_w numeric := case when p_wide then 10 else 5 end;
  d_f numeric := case when p_wide then 20 else 10 end;
  min_runners constant integer := 5;
  ids text[];
  n integer;
  is_demo boolean;
  items jsonb;
begin
  select * into me from public.runner_profiles where user_id = auth.uid();
  if not found or me.height_cm is null or me.weight_kg is null or me.shoe_size_mm is null or me.typical_run_distance is null then
    return jsonb_build_object('status', 'profile_missing', 'range', case when p_wide then 'wide' else 'base' end,
                              'runners', null, 'min_runners', min_runners, 'demo', false, 'items', '[]'::jsonb);
  end if;

  select coalesce(array_agg(r.id), '{}'), coalesce(bool_or(r.data_source = 'demo'), false)
    into ids, is_demo
  from public.seed_runners r
  where r.typical_run_distance = me.typical_run_distance
    and r.height_cm between me.height_cm - d_h and me.height_cm + d_h
    and r.weight_kg between me.weight_kg - d_w and me.weight_kg + d_w
    and r.shoe_size_mm between me.shoe_size_mm - d_f and me.shoe_size_mm + d_f;

  n := coalesce(array_length(ids, 1), 0);

  if n < min_runners then
    return jsonb_build_object('status', 'insufficient', 'range', case when p_wide then 'wide' else 'base' end,
                              'runners', n, 'min_runners', min_runners, 'demo', is_demo, 'items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(x order by x.runners desc, x.display_name collate "C"), '[]'::jsonb) into items
  from (
    select p.id as product_id, p.brand, p.model_name, p.display_name, p.primary_use, p.tags,
           p.image_url, p.image_approved,
           count(distinct s.runner_id)::int as runners,
           round(count(distinct s.runner_id)::numeric / n, 4) as share,
           sum(s.run_count)::int as run_count,
           sum(s.total_km) as total_km
    from public.seed_runner_shoes s
    join public.products p on p.id = s.product_id and p.active
    where s.runner_id = any(ids)
    group by p.id
  ) x;

  return jsonb_build_object('status', 'ok', 'range', case when p_wide then 'wide' else 'base' end,
                            'runners', n, 'min_runners', min_runners, 'demo', is_demo, 'items', items);
end;
$$;

revoke all on function public.runners_like_you(boolean) from public, anon;
grant execute on function public.runners_like_you(boolean) to authenticated;

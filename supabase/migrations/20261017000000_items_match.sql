-- ITEMS cold start (docs/ITEMS_COLD_START.md): one call decides what the ITEMS screen can honestly show.
--
--   1. real    · base  — non-demo sample runners, ±5cm · ±5kg · ±10mm · same usual distance, ≥ 5 runners → counts + shares
--   2. real    · wide  — same, ±10 · ±10 · ±20                                                   → counts + shares
--   3. example · base  — DEMO (synthetic) runners only, base range, ≥ 5                          → product list, NO numbers
--   4. example · wide  — DEMO runners only, wide range                                           → product list, NO numbers
--   5. browse          — every active product (also when the profile is incomplete)              → product list, NO numbers
--
-- Real and DEMO runners are never counted together. The caller's own runner_profiles row is only used as the
-- matching key — no user profile is ever counted as a "runner like you" for anyone else.
-- A tier is used only when it yields at least one active product; otherwise the next tier is tried.
-- Applying this file adds public.items_match() and makes the old public.runners_like_you() ignore DEMO rows.
-- It does not read, change or delete any existing row.

create or replace function public.items_match()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.runner_profiles%rowtype;
  complete boolean := false;
  min_runners constant integer := 5;
  t record;
  ids text[];
  n integer;
  items jsonb;
begin
  select * into me from public.runner_profiles where user_id = auth.uid();
  complete := found and me.height_cm is not null and me.weight_kg is not null
              and me.shoe_size_mm is not null and me.typical_run_distance is not null;

  if complete then
    for t in
      select * from (values (1, false, false), (2, false, true), (3, true, false), (4, true, true)) as tier(ord, is_demo, wide)
      order by ord
    loop
      select coalesce(array_agg(r.id), '{}')
        into ids
      from public.seed_runners r
      where (r.data_source = 'demo') = t.is_demo
        and r.typical_run_distance = me.typical_run_distance
        and r.height_cm between me.height_cm - (case when t.wide then 10 else 5 end) and me.height_cm + (case when t.wide then 10 else 5 end)
        and r.weight_kg between me.weight_kg - (case when t.wide then 10 else 5 end) and me.weight_kg + (case when t.wide then 10 else 5 end)
        and r.shoe_size_mm between me.shoe_size_mm - (case when t.wide then 20 else 10 end) and me.shoe_size_mm + (case when t.wide then 20 else 10 end);
      n := coalesce(array_length(ids, 1), 0);
      continue when n < min_runners;

      if not t.is_demo then
        -- real runners: distinct-runner counts and shares (same rules as runners_like_you)
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
        if jsonb_array_length(items) > 0 then
          return jsonb_build_object('status', 'real', 'range', case when t.wide then 'wide' else 'base' end,
                                    'runners', n, 'min_runners', min_runners, 'profile_complete', true, 'items', items);
        end if;
      else
        -- DEMO runners: which products appear — no counts, no shares, no run data, neutral (name) order
        select coalesce(jsonb_agg(x order by x.display_name collate "C"), '[]'::jsonb) into items
        from (
          select distinct p.id as product_id, p.brand, p.model_name, p.display_name, p.primary_use, p.tags,
                 p.image_url, p.image_approved,
                 null::int as runners, null::numeric as share, null::int as run_count, null::numeric as total_km
          from public.seed_runner_shoes s
          join public.products p on p.id = s.product_id and p.active
          where s.runner_id = any(ids)
        ) x;
        if jsonb_array_length(items) > 0 then
          return jsonb_build_object('status', 'example', 'range', case when t.wide then 'wide' else 'base' end,
                                    'runners', null, 'min_runners', min_runners, 'profile_complete', true, 'items', items);
        end if;
      end if;
    end loop;
  end if;

  -- browse: the active catalogue, no numbers
  select coalesce(jsonb_agg(x order by x.display_name collate "C"), '[]'::jsonb) into items
  from (
    select p.id as product_id, p.brand, p.model_name, p.display_name, p.primary_use, p.tags,
           p.image_url, p.image_approved,
           null::int as runners, null::numeric as share, null::int as run_count, null::numeric as total_km
    from public.products p
    where p.active
  ) x;
  return jsonb_build_object('status', 'browse', 'range', null, 'runners', null, 'min_runners', min_runners,
                            'profile_complete', complete, 'items', items);
end;
$$;

revoke all on function public.items_match() from public;
revoke all on function public.items_match() from anon;
grant execute on function public.items_match() to authenticated;

comment on function public.items_match() is
  'ITEMS: real (base→wide) → example from DEMO runners (base→wide, no numbers) → browse active products. Real and DEMO never mixed.';

-- The previous function stays callable (older clients) but must never count DEMO rows as real runners.
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
  items jsonb;
begin
  select * into me from public.runner_profiles where user_id = auth.uid();
  if not found or me.height_cm is null or me.weight_kg is null or me.shoe_size_mm is null or me.typical_run_distance is null then
    return jsonb_build_object('status', 'profile_missing', 'range', case when p_wide then 'wide' else 'base' end,
                              'runners', null, 'min_runners', min_runners, 'demo', false, 'items', '[]'::jsonb);
  end if;

  select coalesce(array_agg(r.id), '{}')
    into ids
  from public.seed_runners r
  where r.data_source <> 'demo'
    and r.typical_run_distance = me.typical_run_distance
    and r.height_cm between me.height_cm - d_h and me.height_cm + d_h
    and r.weight_kg between me.weight_kg - d_w and me.weight_kg + d_w
    and r.shoe_size_mm between me.shoe_size_mm - d_f and me.shoe_size_mm + d_f;

  n := coalesce(array_length(ids, 1), 0);

  if n < min_runners then
    return jsonb_build_object('status', 'insufficient', 'range', case when p_wide then 'wide' else 'base' end,
                              'runners', n, 'min_runners', min_runners, 'demo', false, 'items', '[]'::jsonb);
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
                            'runners', n, 'min_runners', min_runners, 'demo', false, 'items', items);
end;
$$;

revoke all on function public.runners_like_you(boolean) from public, anon;
grant execute on function public.runners_like_you(boolean) to authenticated;

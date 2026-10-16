// Runners Like You — the same rules as public.runners_like_you() and public.items_match() (SQL).
// scripts/verify-items-sql.mts checks that SQL and TypeScript give identical results on the same data.
// Policy (2026-10-13, user-confirmed; cold start 2026-10-17, docs/ITEMS_COLD_START.md):
//   base  : height ±5cm · weight ±5kg · foot ±10mm · same usual-distance bucket (inclusive)
//   wide  : ±10 · ±10 · ±20 — tried automatically when base has fewer than 5
//   N < 5 : no real numbers. Animal type is never used. X and N count distinct runners. DEMO runners are never real.
import type { ItemsDataset, ItemsMatch, MatchItem, MatchProfile, Range, RunnersLikeYou, ShoeShare } from "./types";

export const MIN_RUNNERS = 5;
export const RANGES: Record<Range, { h: number; w: number; f: number }> = {
  base: { h: 5, w: 5, f: 10 },
  wide: { h: 10, w: 10, f: 20 },
};

const round4 = (x: number) => Math.round(x * 10_000) / 10_000;

export function runnersLikeYou(data: ItemsDataset, me: MatchProfile, range: Range): RunnersLikeYou {
  const base = { range, min_runners: MIN_RUNNERS };
  if (me.height_cm == null || me.weight_kg == null || me.shoe_size_mm == null || !me.typical_run_distance) {
    return { ...base, status: "profile_missing", runners: null, demo: false, items: [] };
  }
  const d = RANGES[range];
  const similar = new Set<string>(); // Set dedupes repeated runner rows
  for (const r of data.runners) {
    if (
      r.data_source !== "demo" && // DEMO runners are never counted as real runners (migration 20261017000000)
      r.typical_run_distance === me.typical_run_distance &&
      Math.abs(r.height_cm - me.height_cm) <= d.h &&
      Math.abs(r.weight_kg - me.weight_kg) <= d.w &&
      Math.abs(r.shoe_size_mm - me.shoe_size_mm) <= d.f
    ) {
      similar.add(r.id);
    }
  }
  const n = similar.size;
  const demo = false; // DEMO rows are excluded above
  if (n < MIN_RUNNERS) return { ...base, status: "insufficient", runners: n, demo, items: [] };

  const products = new Map(data.products.map((p) => [p.id, p]));
  const byProduct = new Map<string, { runners: Set<string>; run_count: number | null; total_km: number | null }>();
  for (const s of data.runner_shoes) {
    if (!similar.has(s.runner_id)) continue;
    const p = products.get(s.product_id);
    if (!p) continue;
    const agg = byProduct.get(p.id) ?? { runners: new Set<string>(), run_count: null, total_km: null };
    if (agg.runners.has(s.runner_id)) continue; // a runner counts once per product
    agg.runners.add(s.runner_id);
    if (s.run_count != null) agg.run_count = (agg.run_count ?? 0) + s.run_count;
    if (s.total_km != null) agg.total_km = Math.round(((agg.total_km ?? 0) + s.total_km) * 10) / 10;
    byProduct.set(p.id, agg);
  }

  const items: ShoeShare[] = [...byProduct.entries()].map(([id, a]) => {
    const p = products.get(id)!;
    return {
      product_id: id,
      brand: p.brand,
      model_name: p.model_name,
      display_name: p.display_name,
      primary_use: p.primary_use,
      tags: p.tags,
      image_url: p.image_url,
      image_approved: p.image_approved,
      runners: a.runners.size,
      share: round4(a.runners.size / n),
      run_count: a.run_count,
      total_km: a.total_km,
    };
  });
  // same order as SQL: runners desc, then display_name (byte order, like Postgres "C" collation for ASCII names)
  items.sort((x, y) => y.runners - x.runners || (x.display_name < y.display_name ? -1 : x.display_name > y.display_name ? 1 : 0));
  return { ...base, status: "ok", runners: n, demo, items };
}

const complete = (me: MatchProfile) => me.height_cm != null && me.weight_kg != null && me.shoe_size_mm != null && Boolean(me.typical_run_distance);
const byName = (x: { display_name: string }, y: { display_name: string }) => (x.display_name < y.display_name ? -1 : x.display_name > y.display_name ? 1 : 0);
const card = (p: ItemsDataset["products"][number]): MatchItem => ({
  product_id: p.id, brand: p.brand, model_name: p.model_name, display_name: p.display_name, primary_use: p.primary_use, tags: p.tags,
  image_url: p.image_url, image_approved: p.image_approved, runners: null, share: null, run_count: null, total_km: null,
});

/**
 * Same rules as public.items_match(): real base → real wide → example base → example wide → browse.
 * `data.products` must be the ACTIVE catalogue. A tier is used only when it yields at least one product.
 */
export function itemsMatch(data: ItemsDataset, me: MatchProfile): ItemsMatch {
  const base = { min_runners: MIN_RUNNERS };
  if (complete(me)) {
    for (const demo of [false, true])
      for (const range of ["base", "wide"] as const) {
        const d = RANGES[range];
        const ids = new Set<string>();
        for (const r of data.runners)
          if (
            (r.data_source === "demo") === demo &&
            r.typical_run_distance === me.typical_run_distance &&
            Math.abs(r.height_cm - me.height_cm!) <= d.h &&
            Math.abs(r.weight_kg - me.weight_kg!) <= d.w &&
            Math.abs(r.shoe_size_mm - me.shoe_size_mm!) <= d.f
          )
            ids.add(r.id);
        if (ids.size < MIN_RUNNERS) continue;
        if (!demo) {
          const real = runnersLikeYou({ ...data, runners: data.runners.filter((r) => ids.has(r.id)) }, me, range);
          if (real.status === "ok" && real.items.length > 0)
            return { ...base, status: "real", range, runners: real.runners, profile_complete: true, items: real.items };
        } else {
          const products = new Map(data.products.map((p) => [p.id, p]));
          const seen = new Map<string, MatchItem>();
          for (const s of data.runner_shoes) if (ids.has(s.runner_id) && products.has(s.product_id)) seen.set(s.product_id, card(products.get(s.product_id)!));
          const items = [...seen.values()].sort(byName);
          if (items.length > 0) return { ...base, status: "example", range, runners: null, profile_complete: true, items };
        }
      }
  }
  return { ...base, status: "browse", range: null, runners: null, profile_complete: complete(me), items: data.products.map(card).sort(byName) };
}

/** "28.6%" — share × 100, one decimal */
export const formatShare = (share: number) => `${(Math.round(share * 1000) / 10).toFixed(1)}%`;

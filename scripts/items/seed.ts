// Synthetic DEMO runners for the ITEMS cold start (docs/ITEMS_COLD_START.md). Pure + deterministic (fixed seed).
//   • body model: Size Korea 8th-survey means where published (S*), stated assumptions elsewhere (A*)
//   • every runner: data_source = "demo", id "SEED-DEMO-0001"…, no run counts, no km, no popularity — 1~2 example shoe links
//   • these rows are only ever shown as "예시 데이터" product lists without numbers (public.items_match())
import type { Product, SeedRunner, SeedRunnerShoe } from "../../src/lib/items/types";

export const SEED_VERSION = "demo-seed-v1";
export const DEFAULT_SEED = 20261016;
export const DEFAULT_SIZE = 300;
export const ID_PREFIX = "SEED-DEMO-";
export const BUCKETS = ["LT_3", "D3_5", "D5_10", "GTE_10"] as const;
export type Sex = "M" | "F";

export const RULES = {
  height_mean: { M: 172.5, F: 159.6 }, // S1 Size Korea 8th (2020.5–2021.12, age 20–69, n = 6,839) — MOTIR release 2022-03-30
  height_sd: { M: 5.8, F: 5.3 }, // A1 (no SD in the release)
  bmi_mean: { M: 24.75, F: 22.6 }, // F: S2 (female mean BMI 22.6) · M: A2 derived from S3 (47.0% of men BMI ≥ 25) with SD 3.3
  bmi_sd: { M: 3.3, F: 3.0 }, // A3
  foot_ratio: { M: 0.151, F: 0.148 }, // A4 foot length ≈ 15% of height (official Size Korea foot table not obtained)
  foot_noise_sd: 6, // A5 (mm)
  shoe_allowance: 7.5, // A6 shoe size = foot length + 7.5mm, rounded to 5mm
  clamp: { height: [140, 205], weight: [38, 130], shoe: [215, 305] }, // inside the seed_runners CHECK ranges
} as const;

/** A7 example links: shoe use that fits each usual distance; uniform choice inside the pool (no popularity). */
export const USE_BY_BUCKET: Record<(typeof BUCKETS)[number], string[]> = {
  LT_3: ["DAILY", "STABILITY"],
  D3_5: ["DAILY", "STABILITY"],
  D5_10: ["DAILY", "LONG", "TEMPO"],
  GTE_10: ["LONG", "TEMPO", "RACE"],
};
export const SECOND_SHOE_P = 0.5; // A8 half of the runners get a 2nd example link from DAILY

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clamp = (x: number, [lo, hi]: readonly number[]) => Math.min(hi, Math.max(lo, x));

/** One body from the model. `shift` moves the BMI mean (used only by the simulation's other scenarios). */
export function body(r: () => number, sex: Sex, shift = { bmi: 0, height: 0, foot: 0 }) {
  const height_cm = clamp(Math.round(RULES.height_mean[sex] + shift.height + RULES.height_sd[sex] * normal(r)), RULES.clamp.height);
  const bmi = RULES.bmi_mean[sex] + shift.bmi + RULES.bmi_sd[sex] * normal(r);
  const weight_kg = clamp(Math.round(bmi * (height_cm / 100) ** 2), RULES.clamp.weight);
  const foot = height_cm * 10 * RULES.foot_ratio[sex] + shift.foot + RULES.foot_noise_sd * normal(r);
  const shoe_size_mm = clamp(Math.round((foot + RULES.shoe_allowance) / 5) * 5, RULES.clamp.shoe);
  return { height_cm, weight_kg, shoe_size_mm };
}

export interface SeedSet {
  runners: (SeedRunner & { sex: Sex })[];
  shoes: SeedRunnerShoe[];
}

/** n runners split as evenly as possible over 4 distance buckets × 2 sexes (a test allocation, not a population ratio). */
export function generateSeed(products: Product[], n = DEFAULT_SIZE, seed = DEFAULT_SEED): SeedSet {
  const r = rng(seed);
  const cells = BUCKETS.flatMap((b) => (["M", "F"] as Sex[]).map((sex) => ({ b, sex })));
  const per = Math.floor(n / cells.length);
  const extra = n % cells.length;
  const daily = products.filter((p) => p.primary_use === "DAILY");
  const runners: SeedSet["runners"] = [];
  const shoes: SeedRunnerShoe[] = [];
  let k = 0;
  cells.forEach(({ b, sex }, ci) => {
    const pool = products.filter((p) => USE_BY_BUCKET[b].includes(p.primary_use ?? ""));
    if (pool.length === 0 || daily.length === 0) throw new Error(`no active products for ${b} (${USE_BY_BUCKET[b].join("/")}) or DAILY`);
    for (let i = 0; i < per + (ci < extra ? 1 : 0); i++) {
      const id = `${ID_PREFIX}${String(++k).padStart(4, "0")}`;
      runners.push({ id, ...body(r, sex), typical_run_distance: b, weekly_distance: null, data_source: "demo", sex });
      const chosen = new Set<string>([pool[Math.floor(r() * pool.length)].id]);
      if (r() < SECOND_SHOE_P) chosen.add(daily[Math.floor(r() * daily.length)].id);
      for (const product_id of chosen) shoes.push({ runner_id: id, product_id, run_count: null, total_km: null });
    }
  });
  return { runners, shoes };
}

/** Throws on anything that must never reach the database. */
export function validateSeed(set: SeedSet, activeProductIds: Set<string>, n = DEFAULT_SIZE): void {
  const errors: string[] = [];
  if (set.runners.length !== n) errors.push(`expected ${n} runners, got ${set.runners.length}`);
  const ids = new Set<string>();
  for (const x of set.runners) {
    if (ids.has(x.id)) errors.push(`duplicate id ${x.id}`);
    ids.add(x.id);
    if (!x.id.startsWith(ID_PREFIX) || x.id.length > 40) errors.push(`bad id ${x.id}`);
    if (x.data_source !== "demo") errors.push(`${x.id} is not demo`);
    if (!(x.height_cm >= 100 && x.height_cm <= 230 && x.weight_kg >= 25 && x.weight_kg <= 200 && x.shoe_size_mm >= 200 && x.shoe_size_mm <= 330)) errors.push(`${x.id} out of DB range`);
  }
  const per = new Map<string, number>();
  for (const s of set.shoes) {
    if (!ids.has(s.runner_id)) errors.push(`shoe for unknown runner ${s.runner_id}`);
    if (!activeProductIds.has(s.product_id)) errors.push(`${s.runner_id}: product ${s.product_id} is not an active product`);
    if (s.run_count != null || s.total_km != null) errors.push(`${s.runner_id}: run data must stay empty`);
    per.set(s.runner_id, (per.get(s.runner_id) ?? 0) + 1);
  }
  for (const id of ids) if (!per.get(id) || per.get(id)! > 2) errors.push(`${id}: needs 1–2 shoes, has ${per.get(id) ?? 0}`);
  if (errors.length) throw new Error(`DEMO seed rejected:\n  ${errors.slice(0, 20).join("\n  ")}`);
}

const q = (v: string | number | null) => (v == null ? "null" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

/** Replace-all SQL: removes ONLY data_source = 'demo' rows (their shoe links cascade), then inserts the new set. */
export function seedSql(set: SeedSet, meta: { seed: number; generatedAt: string }): string {
  const lines = [
    `-- GearMatch ITEMS DEMO seed (${SEED_VERSION}) · synthetic runners, data_source = 'demo' · seed ${meta.seed} · ${set.runners.length} runners · ${set.shoes.length} shoe links`,
    `-- generated ${meta.generatedAt} by scripts/items/generate-seed.ts — docs/ITEMS_COLD_START.md`,
    `-- Touches only demo rows. Rollback: delete from public.seed_runners where data_source = 'demo';`,
    "begin;",
    "delete from public.seed_runners where data_source = 'demo';",
    "insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, weekly_distance, data_source) values",
    set.runners.map((x) => `  (${q(x.id)}, ${x.height_cm}, ${x.weight_kg}, ${x.shoe_size_mm}, ${q(x.typical_run_distance)}, null, 'demo')`).join(",\n") + ";",
    "insert into public.seed_runner_shoes (runner_id, product_id, run_count, total_km) values",
    set.shoes.map((s) => `  (${q(s.runner_id)}, ${q(s.product_id)}, null, null)`).join(",\n") + ";",
    "commit;",
    "",
  ];
  return lines.join("\n");
}

/** Active products from the generated catalogue SQL (supabase/seed/items.generated.sql, git-ignored). */
export function productsFromCatalogSql(sql: string): Product[] {
  const rows = [...sql.matchAll(/\('(GM-[^']+)', '((?:[^']|'')*)', (?:'((?:[^']|'')*)'|null), '((?:[^']|'')*)', '((?:[^']|'')*)', (?:'([^']*)'|null), array\[([^\]]*)\]::text\[\], (?:'([^']*)'|null), (?:'([^']*)'|null), (true|false), (true|false)/g)];
  return rows
    .filter((m) => m[11] === "true")
    .map((m) => ({
      id: m[1], brand: m[2].replace(/''/g, "'"), brand_ko: m[3] ?? null, model_name: m[4].replace(/''/g, "'"), display_name: m[5].replace(/''/g, "'"),
      primary_use: m[6] ?? null, tags: m[7].split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean),
      official_url: m[8] ?? null, image_url: m[9] ?? null, image_approved: m[10] === "true",
    }));
}

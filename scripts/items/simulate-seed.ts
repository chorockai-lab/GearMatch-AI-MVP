// ITEMS cold-start simulation — runs the app's own itemsMatch() (== public.items_match(), checked by verify:sql)
// on the DEMO seed against SEPARATE test-user scenarios, so the seed is not graded only on its own distribution.
// Local only, no database. Run: npm run items:simulate -- [--out <file.json>]
import { readFileSync, writeFileSync } from "node:fs";
import { itemsMatch } from "../../src/lib/items/aggregate";
import type { ItemsDataset, MatchProfile, Product, SeedRunner } from "../../src/lib/items/types";
import { body, BUCKETS, DEFAULT_SEED, generateSeed, normal, productsFromCatalogSql, rng, RULES, type Sex } from "./seed";

const products: Product[] = productsFromCatalogSql(readFileSync("supabase/seed/items.generated.sql", "utf8"));
type User = MatchProfile & { sex: Sex };
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);

function dataset(n: number, seed: number, extra: SeedRunner[] = [], extraShoes: ItemsDataset["runner_shoes"] = []): ItemsDataset {
  const s = generateSeed(products, n, seed);
  return { products, runners: [...s.runners, ...extra], runner_shoes: [...s.shoes, ...extraShoes] };
}

/** base = found in the base range · auto = base or the automatic wide range · shown = any product list (always, via browse) */
function score(ds: ItemsDataset, users: User[]) {
  let base = 0, auto = 0, shown = 0;
  const status: Record<string, number> = {};
  const res = users.map((u) => {
    const r = itemsMatch(ds, u);
    const key = `${r.status}${r.range ? "/" + r.range : ""}`;
    status[key] = (status[key] ?? 0) + 1;
    const found = r.status !== "browse";
    if (found && r.range === "base") base++;
    if (found) auto++;
    if (r.items.length > 0) shown++;
    return { u, r, found, isBase: found && r.range === "base" };
  });
  return { users: users.length, base: pct(base, users.length), auto: pct(auto, users.length), shown: pct(shown, users.length), status, res };
}

function drawUsers(n: number, seed: number, shift = { bmi: 0, height: 0, foot: 0 }, footSpread = 0): User[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const sex: Sex = i % 2 ? "F" : "M";
    const b = body(r, sex, { ...shift, foot: shift.foot + (footSpread ? footSpread * (i % 4 < 2 ? 1 : -1) : 0) });
    return { ...b, typical_run_distance: BUCKETS[Math.floor(i / 2) % 4], sex };
  });
}

// ── scenarios (users never come from the seed's own random stream) ─────────────
const USERS = 4000;
const scenarios: Record<string, { note: string; users: User[] }> = {
  S1_same_model: { note: "같은 신체 모델에서 독립 추출(낙관적 기준)", users: drawUsers(USERS, 101) },
  S2_leaner: { note: "BMI 평균 −1.5 (러너가 일반 인구보다 마른 경우)", users: drawUsers(USERS, 202, { bmi: -1.5, height: 0, foot: 0 }) },
  S3_heavier: { note: "BMI 평균 +2.0", users: drawUsers(USERS, 303, { bmi: 2, height: 0, foot: 0 }) },
  S4_foot_off: { note: "발 사이즈가 모델 평균에서 ±12mm 벗어남", users: drawUsers(USERS, 404, { bmi: 0, height: 0, foot: 0 }, 12) },
  S5_taller: { note: "키 평균 +4cm (젊은 층 가정)", users: drawUsers(USERS, 505, { bmi: 0, height: 4, foot: 0 }) },
};
// S6: uniform stress grid — every height 145–195 (5cm) × BMI 17–33 (2) × sex × bucket, foot at the model mean
const grid: User[] = [];
for (const sex of ["M", "F"] as Sex[])
  for (let h = 145; h <= 195; h += 5)
    for (let bmi = 17; bmi <= 33; bmi += 2)
      for (const b of BUCKETS)
        grid.push({ sex, height_cm: h, weight_kg: Math.round(bmi * (h / 100) ** 2), shoe_size_mm: Math.round((h * 10 * RULES.foot_ratio[sex] + RULES.shoe_allowance) / 5) * 5, typical_run_distance: b });
scenarios.S6_uniform_grid = { note: "키 145~195 × BMI 17~33 균등 격자(분포 무시, 취약 구간 탐색)", users: grid };

const main = dataset(300, DEFAULT_SEED);
const out: Record<string, unknown> = { seed: DEFAULT_SEED, products: products.length, runners: main.runners.length, scenarios: {} };
for (const [name, s] of Object.entries(scenarios)) {
  const sc = score(main, s.users);
  (out.scenarios as Record<string, unknown>)[name] = { note: s.note, users: sc.users, base: sc.base, auto: sc.auto, shown: sc.shown, status: sc.status };
}

// ── groups (S1 + S2 combined so tall / extreme users are not too rare) ───────
const pool = [...score(main, scenarios.S1_same_model.users).res, ...score(main, scenarios.S2_leaner.users).res];
const groups: Record<string, Record<string, { users: number; base: number; auto: number }>> = {};
const band = (x: number, edges: number[], labels: string[]) => labels[edges.findIndex((e) => x < e)] ?? labels[labels.length - 1];
for (const x of pool) {
  const u = x.u as User;
  const bmi = u.weight_kg! / (u.height_cm! / 100) ** 2;
  const expected = Math.round((u.height_cm! * 10 * RULES.foot_ratio[u.sex] + RULES.shoe_allowance) / 5) * 5;
  const keys: [string, string][] = [
    ["sex", u.sex],
    ["distance", u.typical_run_distance!],
    ["height", band(u.height_cm!, [155, 165, 175, 185], ["<155", "155–164", "165–174", "175–184", "≥185"])],
    ["bmi", band(bmi, [18.5, 23, 25, 30], ["<18.5", "18.5–22.9", "23–24.9", "25–29.9", "≥30"])],
    ["foot_vs_height", Math.abs(u.shoe_size_mm! - expected) >= 15 ? "±15mm 이상 벗어남" : "평균 근처"],
  ];
  for (const [dim, key] of keys) {
    const g = ((groups[dim] ??= {})[key] ??= { users: 0, base: 0, auto: 0 });
    g.users++;
    if (x.isBase) g.base++;
    if (x.found) g.auto++;
  }
}
for (const dim of Object.values(groups)) for (const g of Object.values(dim)) { g.base = pct(g.base, g.users); g.auto = pct(g.auto, g.users); }
out.groups_S1_S2 = groups;

// ── profile missing → browse (always a list) ──────────────────────────────────
const full: MatchProfile = { height_cm: 172, weight_kg: 70, shoe_size_mm: 270, typical_run_distance: "D5_10" };
out.profile_missing = (["height_cm", "weight_kg", "shoe_size_mm", "typical_run_distance"] as const).map((k) => {
  const r = itemsMatch(main, { ...full, [k]: null });
  return { missing: k, status: r.status, profile_complete: r.profile_complete, items: r.items.length, numbers: r.items.some((i) => i.runners != null || i.share != null) };
});
// no DEMO links for the matched group (catalogue only) → browse still lists products
const noLinks = itemsMatch({ ...main, runner_shoes: [] }, full);
out.example_without_products = { status: noLinks.status, items: noLinks.items.length };

// ── separation: 6 real runners next to the 300 DEMO runners ───────────────────
const reals: SeedRunner[] = Array.from({ length: 6 }, (_, i) => ({ id: `REAL-${i}`, height_cm: 172 + (i % 3) - 1, weight_kg: 70 + (i % 2), shoe_size_mm: 270, typical_run_distance: "D5_10", weekly_distance: null, data_source: "survey" }));
const realShoes = reals.map((r, i) => ({ runner_id: r.id, product_id: products[i % 2].id, run_count: 3, total_km: 20 }));
const mixed = dataset(300, DEFAULT_SEED, reals, realShoes);
const rm = itemsMatch(mixed, full);
out.separation = { status: rm.status, range: rm.range, runners: rm.runners, items: rm.items.map((i) => [i.product_id, i.runners]), demoIgnored: rm.runners === 6 };

// ── repeatability: 30 seeds for the runners, fixed users (S1) ─────────────────
const fixedUsers = drawUsers(2000, 777);
out.seed_spread = [120, 300].map((n) => {
  const xs = Array.from({ length: 30 }, (_, i) => score(dataset(n, i === 0 ? DEFAULT_SEED : i), fixedUsers));
  const sorted = (k: "base" | "auto") => xs.map((x) => x[k]).sort((a, b) => a - b);
  const sum = (k: "base" | "auto") => { const v = sorted(k); return { mean: Math.round((10 * v.reduce((a, b) => a + b, 0)) / v.length) / 10, min: v[0], p10: v[3], p90: v[26], max: v[29], default_seed: xs[0][k] }; };
  return { n, base: sum("base"), auto: sum("auto") };
});

void normal;
const file = (() => { const i = process.argv.indexOf("--out"); return i < 0 ? null : process.argv[i + 1]; })();
if (file) writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));

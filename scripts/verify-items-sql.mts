// STEP 4 SQL checks on an embedded Postgres (PGlite) — no network, no secrets, runs in CI.
//   • both migrations apply; ITEMS migration is re-runnable
//   • clients cannot read sample runners or their shoes (only the aggregate function)
//   • products: only active rows readable; saved_products: own rows only
//   • public.runners_like_you() == src/lib/items/aggregate.ts on the same data (288 profile × range cases)
// Fixture rows are synthetic test data generated here, not product data. Run: npm run verify:sql
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { itemsMatch, runnersLikeYou } from "../src/lib/items/aggregate";
import type { ItemsDataset, MatchProfile, Product, SeedRunner, SeedRunnerShoe } from "../src/lib/items/types";
import { generateSeed } from "./items/seed";

let fail = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail++;
};

const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated; grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
const init = readFileSync("supabase/migrations/20261013000000_init.sql", "utf8");
const items = readFileSync("supabase/migrations/20261014000000_items.sql", "utf8");
const match = readFileSync("supabase/migrations/20261017000000_items_match.sql", "utf8");
try {
  await db.exec(init);
  await db.exec(items);
  await db.exec(items);
  await db.exec(match);
  await db.exec(match);
  check(true, "init + items + items_match migrations apply; both re-runnable");
} catch (e) {
  check(false, `migration error: ${(e as Error).message}`);
  process.exit(1);
}

// ── synthetic fixture ───────────────────────────────────────────────────────
let seed = 4242;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const DIST = ["LT_3", "D3_5", "D5_10", "GTE_10"] as const;
const products: (Product & { active: boolean })[] = Array.from({ length: 12 }, (_, i) => ({
  id: `GM-TEST-P${String(i + 1).padStart(2, "0")}`, brand: i % 2 ? "Beta" : "Alpha", brand_ko: null,
  model_name: `Model ${i + 1}`, display_name: `${i % 2 ? "Beta" : "Alpha"} Model ${i + 1}`, primary_use: "DAILY", tags: ["DAILY"],
  official_url: null, image_url: null, image_approved: false, active: i !== 11, // P12 inactive
}));
const runners: SeedRunner[] = Array.from({ length: 90 }, (_, i) => ({
  id: `T${i + 1}`,
  height_cm: Math.round((158 + rnd() * 30) * 10) / 10,
  weight_kg: Math.round((50 + rnd() * 40) * 10) / 10,
  shoe_size_mm: 240 + Math.round(rnd() * 12) * 5,
  typical_run_distance: DIST[Math.floor(rnd() * 4)],
  weekly_distance: null,
  data_source: i % 9 === 0 ? "demo" : "survey",
}));
const shoes: SeedRunnerShoe[] = [];
for (const r of runners) {
  const k = 1 + Math.floor(rnd() * 3);
  const set = new Set<number>();
  while (set.size < k) set.add(Math.floor(rnd() * 12));
  for (const p of set) shoes.push({ runner_id: r.id, product_id: products[p].id, run_count: rnd() < 0.2 ? null : 1 + Math.floor(rnd() * 20), total_km: rnd() < 0.2 ? null : Math.round(rnd() * 2000) / 10 });
}
for (const p of products)
  await db.query(`insert into public.products (id, brand, model_name, display_name, primary_use, tags, active) values ($1,$2,$3,$4,$5,$6,$7)`, [p.id, p.brand, p.model_name, p.display_name, p.primary_use, p.tags, p.active]);
for (const r of runners)
  await db.query(`insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, data_source) values ($1,$2,$3,$4,$5,$6)`, [r.id, r.height_cm, r.weight_kg, r.shoe_size_mm, r.typical_run_distance, r.data_source]);
for (const s of shoes)
  await db.query(`insert into public.seed_runner_shoes (runner_id, product_id, run_count, total_km) values ($1,$2,$3,$4)`, [s.runner_id, s.product_id, s.run_count, s.total_km]);

const U1 = "00000000-0000-0000-0000-0000000000a1";
const U2 = "00000000-0000-0000-0000-0000000000a2";
await db.query(`insert into auth.users (id) values ($1), ($2)`, [U1, U2]);
const asUser = async (uid: string) => db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
const asAdmin = async () => db.exec(`reset role;`);

// ── privacy / RLS ───────────────────────────────────────────────────────────
await asUser(U1);
for (const t of ["seed_runners", "seed_runner_shoes"]) {
  let denied = false;
  try {
    await db.query(`select * from public.${t} limit 1`);
  } catch {
    denied = true;
  }
  check(denied, `signed-in user cannot read ${t} (body data stays server-side)`);
}
const visible = await db.query<{ n: number }>(`select count(*)::int as n from public.products`);
check(visible.rows[0].n === 11, `only active products readable (${visible.rows[0].n} of 12)`);
await db.query(`insert into public.saved_products (product_id) values ('GM-TEST-P01')`);
let impersonated = false;
try {
  await db.query(`insert into public.saved_products (user_id, product_id) values ($1, 'GM-TEST-P02')`, [U2]);
  impersonated = true;
} catch {
  /* expected */
}
check(!impersonated, "cannot save a product as another user");
await asUser(U2);
const otherSaved = await db.query<{ n: number }>(`select count(*)::int as n from public.saved_products`);
check(otherSaved.rows[0].n === 0, "user B does not see user A's saved shoes");
let anonDenied = false;
await db.exec(`set role anon;`);
try {
  await db.query(`select public.runners_like_you(false)`);
} catch {
  anonDenied = true;
}
check(anonDenied, "signed-out (anon) cannot call runners_like_you()");
await asAdmin();

// ── SQL function == TypeScript aggregation ──────────────────────────────────
const dataset: ItemsDataset = { products: products.filter((p) => p.active).map((p) => { const { active, ...rest } = p; void active; return rest; }), runners, runner_shoes: shoes };
const call = async (uid: string, wide: boolean) => {
  await asUser(uid);
  const r = await db.query<{ r: Record<string, unknown> }>(`select public.runners_like_you($1) as r`, [wide]);
  await asAdmin();
  return r.rows[0].r;
};
/** canonical form: sorted keys (jsonb reorders them), numeric strings → numbers, tags ignored (array order only) */
const canon = (v: unknown, k = ""): unknown => {
  if (k === "share" || k === "total_km") return v == null ? null : Number(v);
  if (Array.isArray(v)) return v.map((x) => canon(x));
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).filter((key) => key !== "tags").sort().map((key) => [key, canon((v as Record<string, unknown>)[key], key)]));
  return v;
};
const norm = (o: unknown) => JSON.stringify(canon(o));

// no profile yet → profile_missing
const none = await call(U1, false);
check(none.status === "profile_missing" && none.runners === null, "no profile row → profile_missing");

let same = 0;
let total = 0;
const statuses: Record<string, number> = {};
let firstDiff = "";
for (const h of [160, 170, 173, 180])
  for (const w of [55, 70, 85])
    for (const f of [250, 270, 290])
      for (const d of DIST) {
        await db.query(
          `insert into public.runner_profiles (user_id, height_cm, weight_kg, shoe_size_mm, typical_run_distance) values ($1,$2,$3,$4,$5)
           on conflict (user_id) do update set height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, shoe_size_mm = excluded.shoe_size_mm, typical_run_distance = excluded.typical_run_distance`,
          [U1, h, w, f, d],
        );
        const me: MatchProfile = { height_cm: h, weight_kg: w, shoe_size_mm: f, typical_run_distance: d };
        for (const wide of [false, true]) {
          const sql = await call(U1, wide);
          const ts = runnersLikeYou(dataset, me, wide ? "wide" : "base");
          total++;
          statuses[ts.status] = (statuses[ts.status] ?? 0) + 1;
          if (norm(sql) === norm(ts)) same++;
          else if (!firstDiff) firstDiff = `${h}/${w}/${f}/${d}/${wide}\n SQL ${norm(sql).slice(0, 300)}\n TS  ${norm(ts).slice(0, 300)}`;
        }
      }
check(same === total, `SQL function == TS aggregation in ${same}/${total} cases ${JSON.stringify(statuses)}`);
if (firstDiff) console.log(firstDiff);
check((statuses.ok ?? 0) > 0 && (statuses.insufficient ?? 0) > 0, "fixture exercises both ok and insufficient paths");

// ── items_match() == itemsMatch(): real → example → browse, never mixed ─────
const callMatch = async (uid: string) => {
  await asUser(uid);
  const r = await db.query<{ r: Record<string, unknown> }>(`select public.items_match() as r`);
  await asAdmin();
  return r.rows[0].r as { status: string; range: string | null; runners: number | null; profile_complete: boolean; items: Record<string, unknown>[] };
};
const setProfile = (h: number | null, w: number, f: number, d: string) =>
  db.query(
    `insert into public.runner_profiles (user_id, height_cm, weight_kg, shoe_size_mm, typical_run_distance) values ($1,$2,$3,$4,$5)
     on conflict (user_id) do update set height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, shoe_size_mm = excluded.shoe_size_mm, typical_run_distance = excluded.typical_run_distance`,
    [U1, h, w, f, d],
  );
async function matchParity(label: string, ds: ItemsDataset) {
  let same2 = 0, total2 = 0, diff = "";
  const st: Record<string, number> = {};
  let leaked = 0;
  for (const h of [155, 165, 172, 180, 190])
    for (const w of [50, 65, 75, 90])
      for (const f of [240, 255, 270, 285])
        for (const d of DIST) {
          await setProfile(h, w, f, d);
          const sql = await callMatch(U1);
          const ts = itemsMatch(ds, { height_cm: h, weight_kg: w, shoe_size_mm: f, typical_run_distance: d });
          total2++;
          st[`${ts.status}/${ts.range}`] = (st[`${ts.status}/${ts.range}`] ?? 0) + 1;
          if (norm(sql) === norm(ts)) same2++;
          else if (!diff) diff = `${h}/${w}/${f}/${d}
 SQL ${norm(sql).slice(0, 300)}
 TS  ${norm(ts).slice(0, 300)}`;
          if (sql.status !== "real" && (sql.runners != null || sql.items.some((i) => i.runners != null || i.share != null || i.run_count != null || i.total_km != null))) leaked++;
        }
  check(same2 === total2, `${label}: items_match() == itemsMatch() in ${same2}/${total2} cases ${JSON.stringify(st)}`);
  if (diff) console.log(diff);
  check(leaked === 0, `${label}: example / browse results carry no counts, shares or run data`);
  return st;
}
// 1) mixed fixture: survey runners (real) + every 9th runner DEMO, plus a dense real group so the real/base path is exercised
const dense: SeedRunner[] = Array.from({ length: 6 }, (_, i) => ({ id: `D${i + 1}`, height_cm: 171 + (i % 3), weight_kg: 69 + (i % 2), shoe_size_mm: 270, typical_run_distance: "D5_10", weekly_distance: null, data_source: "partner" }));
const denseShoes: SeedRunnerShoe[] = dense.map((r, i) => ({ runner_id: r.id, product_id: products[i % 3].id, run_count: 2, total_km: 11 }));
for (const r of dense) await db.query(`insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, data_source) values ($1,$2,$3,$4,$5,$6)`, [r.id, r.height_cm, r.weight_kg, r.shoe_size_mm, r.typical_run_distance, r.data_source]);
for (const x of denseShoes) await db.query(`insert into public.seed_runner_shoes (runner_id, product_id, run_count, total_km) values ($1,$2,$3,$4)`, [x.runner_id, x.product_id, x.run_count, x.total_km]);
runners.push(...dense);
shoes.push(...denseShoes);
const st1 = await matchParity("mixed real + DEMO", dataset);
check(Boolean(st1["real/base"]) && Boolean(st1["real/wide"]) && Boolean(st1["browse/null"]), `mixed fixture exercises real/base, real/wide and browse`);

// 2) separation: real counts are identical with and without the DEMO rows in the database
await setProfile(173, 70, 270, "D5_10");
const withDemo = await callMatch(U1);
const demoIds = runners.filter((r) => r.data_source === "demo").map((r) => r.id);
await asAdmin();
const backup = await db.query<Record<string, unknown>>(`select * from public.seed_runner_shoes where runner_id = any($1)`, [demoIds]);
await db.query(`update public.seed_runners set data_source = 'internal' where false`); // no-op guard: real rows are never rewritten
await db.query(`delete from public.seed_runner_shoes where runner_id = any($1)`, [demoIds]);
await db.query(`delete from public.seed_runners where id = any($1)`, [demoIds]);
const withoutDemo = await callMatch(U1);
check(norm(withDemo) === norm(withoutDemo), `DEMO rows never change a real result (${withDemo.status}/${withDemo.range}, ${withDemo.runners} runners)`);
for (const r of runners.filter((x) => x.data_source === "demo"))
  await db.query(`insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, data_source) values ($1,$2,$3,$4,$5,'demo')`, [r.id, r.height_cm, r.weight_kg, r.shoe_size_mm, r.typical_run_distance]);
for (const b of backup.rows) await db.query(`insert into public.seed_runner_shoes (runner_id, product_id, run_count, total_km) values ($1,$2,$3,$4)`, [b.runner_id, b.product_id, b.run_count, b.total_km]);

// 3) DEMO-only database (no real runners yet — the launch situation): example / browse only
await db.query(`update public.seed_runners set data_source = 'demo'`);
const allDemo: ItemsDataset = { ...dataset, runners: runners.map((r) => ({ ...r, data_source: "demo" as const })) };
const st3 = await matchParity("DEMO only", allDemo);
check(Object.keys(st3).some((k) => k.startsWith("example/")) && !Object.keys(st3).some((k) => k.startsWith("real/")), "DEMO-only database: examples, never real");

// 3b) the real generator (300 synthetic runners) on a synthetic catalogue with every shoe use
const uses = ["DAILY", "LONG", "TEMPO", "RACE", "STABILITY"];
const cat: Product[] = uses.flatMap((u, i) => [0, 1].map((k) => ({ id: `GM-TEST-${u}-${k}`, brand: "Gamma", brand_ko: null, model_name: `${u} ${k}`, display_name: `Gamma ${u} ${k}`, primary_use: u, tags: [u], official_url: null, image_url: null, image_approved: false, _i: i })))
  .map(({ _i, ...p }) => (void _i, p));
for (const p of cat) await db.query(`insert into public.products (id, brand, model_name, display_name, primary_use, tags, active) values ($1,$2,$3,$4,$5,$6,true)`, [p.id, p.brand, p.model_name, p.display_name, p.primary_use, p.tags]);
await db.query(`delete from public.seed_runners`);
const gen = generateSeed(cat, 300, 20261016);
for (const r of gen.runners) await db.query(`insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, data_source) values ($1,$2,$3,$4,$5,'demo')`, [r.id, r.height_cm, r.weight_kg, r.shoe_size_mm, r.typical_run_distance]);
for (const x of gen.shoes) await db.query(`insert into public.seed_runner_shoes (runner_id, product_id) values ($1,$2)`, [x.runner_id, x.product_id]);
const seedDs: ItemsDataset = { products: [...dataset.products, ...cat], runners: gen.runners.map(({ sex, ...r }) => (void sex, r)), runner_shoes: gen.shoes };
const st3b = await matchParity("300 DEMO seed", seedDs);
check(Boolean(st3b["example/base"]) && Boolean(st3b["example/wide"]) && !Object.keys(st3b).some((k) => k.startsWith("real/")), "300 DEMO seed exercises example/base and example/wide, never real");
const legacy = await call(U1, true);
check(legacy.status !== "ok" && legacy.demo === false, `old runners_like_you() ignores DEMO rows (${legacy.status})`);

// 4) profile incomplete → browse with the active catalogue (inactive products never listed)
await db.query(`update public.runner_profiles set shoe_size_mm = null where user_id = $1`, [U1]);
const browse = await callMatch(U1);
check(browse.status === "browse" && browse.profile_complete === false && browse.items.length === 21 && !browse.items.some((i) => i.product_id === "GM-TEST-P12"),
  `incomplete profile → browse, 21 active products, inactive hidden (${browse.status}, ${browse.items.length})`);

// 5) anon cannot call items_match()
await db.exec(`set role anon;`);
let anonMatch = false;
try { await db.query(`select public.items_match()`); } catch { anonMatch = true; }
await asAdmin();
check(anonMatch, "signed-out (anon) cannot call items_match()");

const missing = await call(U1, true);
check(missing.status === "profile_missing" && (missing.items as unknown[]).length === 0, "profile without foot size → profile_missing, no list");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nALL ITEMS SQL CHECKS PASSED");
process.exit(fail ? 1 : 0);

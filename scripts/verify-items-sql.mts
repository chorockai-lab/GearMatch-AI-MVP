// STEP 4 SQL checks on an embedded Postgres (PGlite) — no network, no secrets, runs in CI.
//   • both migrations apply; ITEMS migration is re-runnable
//   • clients cannot read sample runners or their shoes (only the aggregate function)
//   • products: only active rows readable; saved_products: own rows only
//   • public.runners_like_you() == src/lib/items/aggregate.ts on the same data (288 profile × range cases)
// Fixture rows are synthetic test data generated here, not product data. Run: npm run verify:sql
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { runnersLikeYou } from "../src/lib/items/aggregate";
import type { ItemsDataset, MatchProfile, Product, SeedRunner, SeedRunnerShoe } from "../src/lib/items/types";

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
try {
  await db.exec(init);
  await db.exec(items);
  await db.exec(items);
  check(true, "init + items migrations apply; items migration re-runnable");
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

await db.query(`update public.runner_profiles set shoe_size_mm = null where user_id = $1`, [U1]);
const missing = await call(U1, true);
check(missing.status === "profile_missing" && (missing.items as unknown[]).length === 0, "profile without foot size → profile_missing, no list");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nALL ITEMS SQL CHECKS PASSED");
process.exit(fail ? 1 : 0);

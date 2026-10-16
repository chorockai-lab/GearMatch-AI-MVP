// DEMO seed for the ITEMS cold start — 300 synthetic runners (docs/ITEMS_COLD_START.md). Deterministic.
// Reads the active catalogue from the generated product SQL (git-ignored) and writes, without touching any database:
//   --sql  <file>   replace-all SQL for public.seed_runners / seed_runner_shoes (only data_source = 'demo' rows)
//   --json <file>   local DEMO dataset for NEXT_PUBLIC_ITEMS_DEMO=1 (products + seed runners) — local screens only
//   --csv  <dir>    seed_runners_demo.csv / seed_runner_shoes_demo.csv for review
// Run: npm run items:seed -- --sql supabase/seed/items.demo-seed.sql --json public/demo-data/items-demo.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_SEED, DEFAULT_SIZE, generateSeed, productsFromCatalogSql, seedSql, validateSeed } from "./seed";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? null : process.argv[i + 1];
};
const catalog = arg("catalog-sql") ?? "supabase/seed/items.generated.sql";
const size = Number(arg("size") ?? DEFAULT_SIZE);
const seed = Number(arg("seed") ?? DEFAULT_SEED);

const products = productsFromCatalogSql(readFileSync(catalog, "utf8"));
if (products.length === 0) throw new Error(`no active products found in ${catalog}`);
const set = generateSeed(products, size, seed);
validateSeed(set, new Set(products.map((p) => p.id)), size);

const write = (file: string, text: string) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`wrote ${file}`);
};
const sqlOut = arg("sql");
if (sqlOut) write(sqlOut, seedSql(set, { seed, generatedAt: new Date().toISOString() }));
const jsonOut = arg("json");
if (jsonOut)
  write(jsonOut, JSON.stringify({ products, runners: set.runners.map(({ sex, ...r }) => (void sex, r)), runner_shoes: set.shoes }));
const csvOut = arg("csv");
if (csvOut) {
  write(`${csvOut}/seed_runners_demo.csv`, ["runner_id,height_cm,weight_kg,shoe_size_mm,typical_run_distance,weekly_distance,data_source",
    ...set.runners.map((r) => `${r.id},${r.height_cm},${r.weight_kg},${r.shoe_size_mm},${r.typical_run_distance},,demo`)].join("\n") + "\n");
  write(`${csvOut}/seed_runner_shoes_demo.csv`, ["runner_id,product_id,run_count,total_km", ...set.shoes.map((s) => `${s.runner_id},${s.product_id},,`)].join("\n") + "\n");
}
console.log(`DEMO seed: ${set.runners.length} runners · ${set.shoes.length} shoe links · ${new Set(set.shoes.map((s) => s.product_id)).size} products · seed ${seed} · catalogue ${products.length} active products`);

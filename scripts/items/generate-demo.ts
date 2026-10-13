// Generates DEMO sample runners for LOCAL testing only (NEXT_PUBLIC_ITEMS_DEMO=1).
//   • 40 invented runners, data_source = "demo" (never imported into the server DB — the importer refuses).
//   • Shoes are real product_ids from the Product DB workbook (active KR products).
//   • Deterministic (fixed seed) so tests and screenshots are repeatable.
// Run: npm run items:demo -- --products "<Product DB>.xlsx"   → data/demo/seed_runners.csv, data/demo/seed_runner_shoes.csv
import { mkdirSync, writeFileSync } from "node:fs";
import { toCsv } from "./io";
import { loadProducts } from "./import";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const i = process.argv.indexOf("--products");
  if (i < 0) {
    console.log('usage: npm run items:demo -- --products "<Product DB>.xlsx"');
    process.exit(2);
  }
  const { products } = await loadProducts(process.argv[i + 1]);
  const pool = products.filter((p) => p.active).map((p) => p.id);
  // shoes most DEMO runners pick from — the Current Shoe POPULAR six first, then the rest of the pool
  const popular = ["GM-NK-PEGASUS-42", "GM-AS-NOVABLAST-6", "GM-NB-FUELCELL-REBEL-V5", "GM-AD-ADIZERO-EVO-SL-BASE", "GM-HK-BONDI-9", "GM-BR-GHOST-18"].filter((id) => pool.includes(id));
  const r = rng(20261013);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const around = (c: number, spread: number) => Math.round((c + (r() * 2 - 1) * spread) * 10) / 10;

  const runners: Record<string, unknown>[] = [];
  const shoes: Record<string, unknown>[] = [];
  for (let k = 1; k <= 40; k++) {
    // 28 runners clustered near 173cm / 70kg / 270mm / 5~10km so the "enough runners" path can be tested,
    // the rest spread out so "not enough" and "wider range" paths happen for other profiles
    const near = k <= 28;
    const runner = {
      runner_id: `DEMO-R${String(k).padStart(3, "0")}`,
      height_cm: near ? around(173, 4.5) : around(170, 16),
      weight_kg: near ? around(70, 4.5) : around(68, 18),
      shoe_size_mm: near ? Math.round(around(270, 9) / 5) * 5 : Math.round(around(265, 30) / 5) * 5,
      typical_run_distance: near ? "D5_10" : pick(["LT_3", "D3_5", "D5_10", "GTE_10"]),
      weekly_distance: pick(["LT_5", "D5_15", "D15_30", "GTE_30", ""]),
      data_source: "demo",
    };
    runner.height_cm = Math.min(229, Math.max(101, runner.height_cm));
    runner.weight_kg = Math.min(199, Math.max(26, runner.weight_kg));
    runner.shoe_size_mm = Math.min(325, Math.max(205, runner.shoe_size_mm));
    runners.push(runner);
    const count = 1 + Math.floor(r() * 2); // 1–2 shoes each
    const chosen = new Set<string>();
    while (chosen.size < count) chosen.add(r() < 0.75 && popular.length ? pick(popular) : pick(pool));
    for (const product_id of chosen) {
      const runs = 2 + Math.floor(r() * 9);
      shoes.push({ runner_id: runner.runner_id, product_id, run_count: runs, total_km: Math.round(runs * around(7, 3) * 10) / 10 });
    }
  }
  mkdirSync("data/demo", { recursive: true });
  writeFileSync("data/demo/seed_runners.csv", toCsv(runners, ["runner_id", "height_cm", "weight_kg", "shoe_size_mm", "typical_run_distance", "weekly_distance", "data_source"]));
  writeFileSync("data/demo/seed_runner_shoes.csv", toCsv(shoes, ["runner_id", "product_id", "run_count", "total_km"]));
  console.log(`DEMO: ${runners.length} runners, ${shoes.length} runner-shoe rows → data/demo/ (git-ignored, local only)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

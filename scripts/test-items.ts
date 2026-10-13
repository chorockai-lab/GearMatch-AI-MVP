// Runners Like You rules (src/lib/items/aggregate.ts) + import validation (scripts/items/validate.ts).
// Fixtures below are hand-made test rows — not product data. Run: npm run test:items
import { formatShare, MIN_RUNNERS, runnersLikeYou } from "../src/lib/items/aggregate";
import type { ItemsDataset, MatchProfile, Product, SeedRunner } from "../src/lib/items/types";
import { productsFromWorkbook, runnerShoesFromRows, runnersFromRows, runnersSql } from "./items/validate";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

const product = (id: string, display: string): Product => ({
  id, brand: display.split(" ")[0], brand_ko: null, model_name: display.split(" ").slice(1).join(" "), display_name: display,
  primary_use: "DAILY", tags: ["DAILY"], official_url: null, image_url: null, image_approved: false,
});
const runner = (id: string, h: number, w: number, f: number, d: SeedRunner["typical_run_distance"] = "D5_10", src: SeedRunner["data_source"] = "survey"): SeedRunner => ({
  id, height_cm: h, weight_kg: w, shoe_size_mm: f, typical_run_distance: d, weekly_distance: null, data_source: src,
});
const me: MatchProfile = { height_cm: 173, weight_kg: 70, shoe_size_mm: 270, typical_run_distance: "D5_10" };

const data: ItemsDataset = {
  products: [product("P-A", "Alpha One"), product("P-B", "Beta Two"), product("P-C", "Charlie Three")],
  runners: [
    runner("R1", 173, 70, 270), // exact
    runner("R2", 178, 75, 280), // base edges (inclusive)
    runner("R3", 168, 65, 260), // base edges (inclusive)
    runner("R4", 175, 72, 265),
    runner("R5", 179, 70, 270), // +6cm → wide only
    runner("R6", 173, 70, 270, "GTE_10"), // other distance bucket → never
    runner("R7", 183, 80, 290), // wide edges
    runner("R8", 184, 70, 270), // +11cm → never
  ],
  runner_shoes: [
    { runner_id: "R1", product_id: "P-A", run_count: 4, total_km: 30.5 },
    { runner_id: "R2", product_id: "P-A", run_count: 2, total_km: 10 },
    { runner_id: "R3", product_id: "P-B", run_count: null, total_km: null },
    { runner_id: "R4", product_id: "P-A", run_count: 1, total_km: 5.2 },
    { runner_id: "R4", product_id: "P-A", run_count: 9, total_km: 99 }, // duplicate row → counted once
    { runner_id: "R5", product_id: "P-C", run_count: 3, total_km: 21 },
    { runner_id: "R7", product_id: "P-B", run_count: 1, total_km: 8 },
    { runner_id: "R6", product_id: "P-C", run_count: 1, total_km: 1 },
    { runner_id: "R1", product_id: "P-UNKNOWN", run_count: 1, total_km: 1 }, // unknown product → ignored
  ],
};

// base: R1–R4 = 4 runners → insufficient, no products leaked
const base = runnersLikeYou(data, me, "base");
check(base.status === "insufficient" && base.runners === 4 && base.items.length === 0, `base: 4 similar (< ${MIN_RUNNERS}) → insufficient, no list (${base.status}/${base.runners})`);
// wide: R1–R5 + R7 = 6 runners → ok
const wide = runnersLikeYou(data, me, "wide");
check(wide.status === "ok" && wide.runners === 6, `wide: 6 similar → ok (${wide.status}/${wide.runners})`);
const a = wide.items.find((i) => i.product_id === "P-A");
check(a?.runners === 3 && a.share === 0.5, `P-A used by 3 of 6 distinct runners, duplicate row ignored (${a?.runners}, ${a?.share})`);
check(a?.run_count === 7 && a.total_km === 45.7, `P-A runs / km summed once per runner (${a?.run_count}, ${a?.total_km})`);
const b = wide.items.find((i) => i.product_id === "P-B");
check(b?.runners === 2 && b.run_count === 1 && b.total_km === 8, `P-B nulls skipped in sums (${b?.run_count}, ${b?.total_km})`);
check(wide.items.map((i) => i.product_id).join(",") === "P-A,P-B,P-C", `order: most runners first, then name (${wide.items.map((i) => i.product_id).join(",")})`);
check(!wide.items.some((i) => i.product_id === "P-UNKNOWN"), "unknown product ignored");
check(formatShare(1 / 3) === "33.3%" && formatShare(8 / 28) === "28.6%" && formatShare(0) === "0.0%", "share format 33.3% / 28.6% / 0.0%");

// profile missing
for (const k of ["height_cm", "weight_kg", "shoe_size_mm", "typical_run_distance"] as const) {
  const r = runnersLikeYou(data, { ...me, [k]: null }, "base");
  check(r.status === "profile_missing" && r.runners === null && r.items.length === 0, `missing ${k} → profile_missing, no numbers`);
}

// DEMO flag only when a matched runner is DEMO
const withDemo: ItemsDataset = { ...data, runners: data.runners.map((r) => (r.id === "R1" ? { ...r, data_source: "demo" } : r)) };
check(runnersLikeYou(withDemo, me, "wide").demo === true && wide.demo === false, "demo flag reflects matched DEMO runners");

// empty dataset (no Excel / DEMO off) → insufficient with 0, never invented
const empty = runnersLikeYou({ products: [], runners: [], runner_shoes: [] }, me, "base");
check(empty.status === "insufficient" && empty.runners === 0 && empty.items.length === 0, "empty dataset → insufficient, 0 runners");

// ── import validation ───────────────────────────────────────────────────────
const rr = runnersFromRows([
  { runner_id: "S1", height_cm: "173", weight_kg: "70", shoe_size_mm: "270", typical_run_distance: "5~10km", weekly_distance: "", data_source: "survey" },
  { runner_id: "S1", height_cm: "173", weight_kg: "70", shoe_size_mm: "270", typical_run_distance: "D5_10", weekly_distance: "", data_source: "survey" },
  { runner_id: "S2", height_cm: "73", weight_kg: "70", shoe_size_mm: "270", typical_run_distance: "D5_10", weekly_distance: "", data_source: "survey" },
  { runner_id: "S3", height_cm: "173", weight_kg: "abc", shoe_size_mm: "27", typical_run_distance: "far", weekly_distance: "lots", data_source: "made-up" },
]);
check(rr.runners.length === 1 && rr.runners[0].typical_run_distance === "D5_10", "Korean label '5~10km' → D5_10");
const fields = rr.issues.map((i) => `${i.row}:${i.field}`).join(" ");
check(/2:runner_id/.test(fields) && /3:height_cm/.test(fields), `duplicate id and out-of-range height rejected (${fields})`);
check(["weight_kg", "shoe_size_mm", "typical_run_distance", "weekly_distance", "data_source"].every((f) => fields.includes(`4:${f}`)), "row 4: every bad field reported");

const ss = runnerShoesFromRows(
  [
    { runner_id: "S1", product_id: "P-A", run_count: "3", total_km: "21.04" },
    { runner_id: "S1", product_id: "P-A", run_count: "1", total_km: "1" },
    { runner_id: "S9", product_id: "P-A" },
    { runner_id: "S1", product_id: "P-Z" },
    { runner_id: "S1", product_id: "P-B", run_count: "2.5" },
  ],
  new Set(["S1"]),
  new Set(["P-A", "P-B"]),
);
check(ss.shoes.length === 1 && ss.shoes[0].total_km === 21, `one valid pair kept, km rounded to 0.1 (${ss.shoes[0]?.total_km})`);
check(ss.issues.length === 4, `duplicate pair, unknown runner, unknown product, fractional runs rejected (${ss.issues.length})`);

let refused = false;
try {
  runnersSql([runner("D1", 170, 60, 260, "D5_10", "demo")], []);
} catch {
  refused = true;
}
check(refused, "server SQL refuses DEMO runners");

const pw = productsFromWorkbook(
  [
    { product_id: "GM-XX-ONE-1", brand: "Brand", display_name: "Brand One 1", market: "KR", kr_sale_confirmed: true, product_status: "CURRENT", official_product_url: "https://example.com/" },
    { product_id: "GM-XX-TWO-2", brand: "Brand", display_name: "Brand Two 2", market: "US", kr_sale_confirmed: false, product_status: "CURRENT", official_product_url: "http://insecure" },
    { product_id: "bad id", brand: "Brand", display_name: "x" },
  ],
  [{ product_id: "GM-XX-ONE-1", primary_use: "DAILY", secondary_use_tags: "LONG;RECOVERY" }],
  [
    { product_id: "GM-XX-ONE-1", image_url: "https://img/1.png", usage_status: "PENDING", active: false },
    { product_id: "GM-XX-TWO-2", image_url: "https://img/2.png", usage_status: "APPROVED", active: true },
  ],
);
const [one, two] = pw.products;
check(one.model_name === "One 1" && one.tags.join(",") === "DAILY,LONG,RECOVERY" && one.active && !one.image_approved, "workbook → model name, tags, KR active, PENDING image not used");
check(!two.active && two.official_url === null && two.image_approved, "US product hidden, http URL dropped, APPROVED image used");
check(pw.issues.length === 1 && pw.issues[0].field === "product_id", "invalid product id reported");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

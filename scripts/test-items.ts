// Runners Like You rules (src/lib/items/aggregate.ts) + import validation (scripts/items/validate.ts).
// Fixtures below are hand-made test rows — not product data. Run: npm run test:items
import { formatShare, itemsMatch, MIN_RUNNERS, runnersLikeYou } from "../src/lib/items/aggregate";
import { detailView, EXAMPLE_BADGE, EXAMPLE_NOTICE, matchView, WIDE_NOTICE } from "../src/lib/items/view";
import { DEFAULT_SEED, generateSeed, ID_PREFIX, seedSql, validateSeed } from "./items/seed";
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

// DEMO runners are never counted as real runners (the old function ignores them)
const withDemo: ItemsDataset = { ...data, runners: data.runners.map((r) => (r.id === "R1" ? { ...r, data_source: "demo" } : r)) };
const wd = runnersLikeYou(withDemo, me, "wide");
check(wd.demo === false && wd.runners === 5, `runnersLikeYou ignores a DEMO runner (6 → ${wd.runners}, demo=${wd.demo})`);

// ── itemsMatch: real base → real wide → example base → example wide → browse ──
const tierOf = (ds: ItemsDataset, p: MatchProfile = me) => { const r = itemsMatch(ds, p); return `${r.status}/${r.range}`; };
check(tierOf(data) === "real/wide", `4 real in base, 6 in wide → real/wide (${tierOf(data)})`);
const fiveBase: ItemsDataset = { ...data, runners: [...data.runners, runner("R9", 172, 69, 270)], runner_shoes: [...data.runner_shoes, { runner_id: "R9", product_id: "P-C", run_count: null, total_km: null }] };
check(tierOf(fiveBase) === "real/base", `5 real in base → real/base (${tierOf(fiveBase)})`);
const demoOnly: ItemsDataset = { ...data, runners: data.runners.map((r) => ({ ...r, data_source: "demo" as const })) };
check(tierOf(demoOnly) === "example/wide", `same runners as DEMO only → example/wide (${tierOf(demoOnly)})`);
const ex = itemsMatch(demoOnly, me);
check(ex.runners === null && ex.items.every((i) => i.runners === null && i.share === null && i.run_count === null && i.total_km === null), "example: no counts, shares or run data");
check(ex.items.map((i) => i.display_name).join("|") === "Alpha One|Beta Two|Charlie Three", `example order is by name, not popularity (${ex.items.map((i) => i.display_name).join("|")})`);
const demoBase: ItemsDataset = { ...fiveBase, runners: fiveBase.runners.map((r) => ({ ...r, data_source: "demo" as const })) };
check(tierOf(demoBase) === "example/base", `5 DEMO in base → example/base (${tierOf(demoBase)})`);
// real beats DEMO even when the DEMO group is closer / larger
const both: ItemsDataset = { ...data, runners: [...data.runners, ...demoBase.runners.map((r) => ({ ...r, id: `X-${r.id}` }))], runner_shoes: [...data.runner_shoes, ...demoBase.runner_shoes.map((s) => ({ ...s, runner_id: `X-${s.runner_id}` }))] };
const bm = itemsMatch(both, me);
check(bm.status === "real" && bm.range === "wide" && bm.runners === 6, `real wide (6) wins over DEMO base (9) and is counted without DEMO (${bm.status}/${bm.range}/${bm.runners})`);
check(JSON.stringify(bm.items.map((i) => [i.product_id, i.runners])) === JSON.stringify(itemsMatch(data, me).items.map((i) => [i.product_id, i.runners])), "real counts identical with or without DEMO rows");
// browse: nobody close, or the profile is incomplete — always the active catalogue, no numbers
const far = itemsMatch(data, { ...me, height_cm: 150, weight_kg: 45 });
check(far.status === "browse" && far.profile_complete === true && far.items.length === 3 && far.items.every((i) => i.runners === null), "no group → browse lists the catalogue without numbers");
const noFoot = itemsMatch(data, { ...me, shoe_size_mm: null });
check(noFoot.status === "browse" && noFoot.profile_complete === false && noFoot.items.length === 3, "missing foot size → browse (profile_complete = false)");
// a group whose products are all unknown / inactive falls through to the next tier
const deadLinks: ItemsDataset = { ...demoBase, runner_shoes: demoBase.runner_shoes.map((s) => ({ ...s, product_id: "P-GONE" })) };
check(tierOf(deadLinks) === "browse/null", `example without any active product → browse (${tierOf(deadLinks)})`);

// ── view rules (what the screens may say) ────────────────────────────────────
const vReal = matchView(itemsMatch(data, me));
check(vReal.showNumbers && vReal.wideNotice && vReal.badge === null, "real wide: numbers shown, wide notice on");
const vEx = matchView(ex);
check(!vEx.showNumbers && vEx.badge === EXAMPLE_BADGE && vEx.notice === EXAMPLE_NOTICE && vEx.wideNotice, "example: no numbers, '예시 데이터' badge, disclaimer, wide notice");
check(EXAMPLE_NOTICE.includes("가상 러너") && EXAMPLE_NOTICE.includes("실제 러너의 착용 기록이나 추천 결과는 아닙니다") && WIDE_NOTICE === "조금 더 넓은 조건에서 찾았어요.", "approved copy for the example notice and the wide notice");
check(!/추천합니다|잘 맞|만족|최고|인기/.test(EXAMPLE_NOTICE + vEx.heading), "example copy makes no fit / satisfaction / popularity claim");
const vBrowse = matchView(far);
check(!vBrowse.showNumbers && vBrowse.notice === "아직 비슷한 조건의 러너 정보가 충분하지 않아요." && !vBrowse.needsProfile, "browse: no numbers, 'not enough runners' notice");
check(matchView(noFoot).needsProfile && matchView(noFoot).notice === null, "browse with incomplete profile asks for the missing info");
const dEx = detailView(ex, "P-A");
const dReal = detailView(itemsMatch(data, me), "P-A");
check(dEx.kind === "example" && dEx.included && !("share" in dEx), "detail of an example product: no share / count");
check(dReal.kind === "real" && dReal.x === 3 && dReal.runners === 6 && dReal.wide, "detail of a real product: real count of the same group");
check(detailView(far, "P-A").kind === "none", "detail while browsing: no numbers");

// ── DEMO seed generator ─────────────────────────────────────────────────────
const uses = ["DAILY", "LONG", "TEMPO", "RACE", "STABILITY"];
const cat: Product[] = uses.flatMap((u) => [0, 1].map((k) => ({ ...product(`GM-${u}-${k}`, `Brand ${u}${k}`), primary_use: u, tags: [u] })));
const g1 = generateSeed(cat, 300, DEFAULT_SEED);
const g2 = generateSeed(cat, 300, DEFAULT_SEED);
check(JSON.stringify(g1) === JSON.stringify(g2), "same seed → identical 300 runners and links (reproducible)");
let seedOk = true;
try { validateSeed(g1, new Set(cat.map((p) => p.id)), 300); } catch (e) { seedOk = false; console.log(String(e)); }
check(seedOk, "300 runners: all demo, SEED-DEMO ids, DB ranges, 1–2 active shoes, no run data");
const cells = new Map<string, number>();
for (const r of g1.runners) cells.set(`${r.typical_run_distance}/${r.sex}`, (cells.get(`${r.typical_run_distance}/${r.sex}`) ?? 0) + 1);
check(cells.size === 8 && Math.max(...cells.values()) - Math.min(...cells.values()) <= 1, `even split over 4 distances × 2 sexes (${[...cells.values()].join(",")})`);
check(g1.runners.every((r) => r.id.startsWith(ID_PREFIX) && r.data_source === "demo") && g1.shoes.every((s) => s.run_count === null && s.total_km === null), "no invented run counts / km");
const useOf = (id: string) => cat.find((p) => p.id === id)!.primary_use!;
const longIds = new Set(g1.runners.filter((r) => r.typical_run_distance === "GTE_10").map((r) => r.id));
check(g1.shoes.filter((s) => longIds.has(s.runner_id)).every((s) => ["LONG", "TEMPO", "RACE", "DAILY"].includes(useOf(s.product_id))), "10km+ runners link only long / tempo / race shoes (+ optional daily)");
let badRejected = false;
try { validateSeed({ ...g1, shoes: [...g1.shoes, { runner_id: g1.runners[0].id, product_id: "GM-NOPE", run_count: 3, total_km: 9 }] }, new Set(cat.map((p) => p.id)), 300); } catch { badRejected = true; }
check(badRejected, "validator rejects unknown products and invented run data");
const sql = seedSql(g1, { seed: DEFAULT_SEED, generatedAt: "test" });
check(sql.includes("delete from public.seed_runners where data_source = 'demo';") && !/delete from public\.seed_runners;|truncate|data_source <> 'demo'/i.test(sql), "seed SQL replaces only demo rows");
check((sql.match(/'demo'\)/g) ?? []).length === 300 && !/survey|partner|internal/.test(sql), "seed SQL inserts 300 demo rows and nothing else");

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

// Validation + normalisation for ITEMS imports (products / seed runners / runner shoes).
// Pure functions: rows in (strings/numbers from CSV or Excel), clean records + errors out.
import type { Product, SeedRunner, SeedRunnerShoe } from "../../src/lib/items/types";

export type Row = Record<string, unknown>;
/** A catalogue product plus whether it is shown in the app (inactive rows stay hidden by RLS). */
export type CatalogProduct = Product & { active: boolean };
export interface Issue {
  sheet: string;
  row: number; // 1-based data row (header excluded)
  field: string;
  message: string;
}

const text = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown) => {
  const t = text(v).replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const bool = (v: unknown) => /^(true|1|y|yes|예|o)$/i.test(text(v));

export const DISTANCE_CODES: Record<string, SeedRunner["typical_run_distance"]> = {
  LT_3: "LT_3", "3KM 미만": "LT_3", "<3": "LT_3",
  D3_5: "D3_5", "3~5KM": "D3_5", "3-5": "D3_5",
  D5_10: "D5_10", "5~10KM": "D5_10", "5-10": "D5_10",
  GTE_10: "GTE_10", "10KM 이상": "GTE_10", "10+": "GTE_10",
};
export const WEEKLY_CODES: Record<string, string> = {
  LT_5: "LT_5", "5KM 미만": "LT_5", D5_15: "D5_15", "5~15KM": "D5_15", D15_30: "D15_30", "15~30KM": "D15_30",
  GTE_30: "GTE_30", "30KM 이상": "GTE_30", UNKNOWN: "UNKNOWN", "잘 모르겠어요": "UNKNOWN",
};
const SOURCES = ["survey", "partner", "internal", "demo"] as const;
const ID_RE = /^[A-Z0-9][A-Z0-9_-]{2,79}$/; // Product DB ids, e.g. GM-HK-CIELO-X1-3_0
const https = (v: unknown) => (/^https:\/\//.test(text(v)) ? text(v) : null);
const code = (map: Record<string, string>, v: unknown) => map[text(v).toUpperCase().replace(/\s+/g, " ")] ?? map[text(v)] ?? null;

/** Product DB v0.3 workbook (01_Product_Master + 02_Recommendation_Attrs + 08_Product_Images) → products */
export function productsFromWorkbook(master: Row[], attrs: Row[], images: Row[]): { products: CatalogProduct[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const attrById = new Map(attrs.map((a) => [text(a.product_id), a]));
  // an image is used only when the workbook marks it APPROVED and active, with an https URL
  const imageById = new Map<string, string>();
  for (const im of images) {
    if (text(im.usage_status).toUpperCase() === "APPROVED" && bool(im.active) && https(im.image_url)) imageById.set(text(im.product_id), https(im.image_url)!);
  }
  const seen = new Set<string>();
  const products: CatalogProduct[] = [];
  master.forEach((m, i) => {
    const id = text(m.product_id);
    const at = (field: string, message: string) => issues.push({ sheet: "01_Product_Master", row: i + 1, field, message });
    if (!ID_RE.test(id)) return at("product_id", `invalid id "${id}"`);
    if (seen.has(id)) return at("product_id", `duplicate id ${id}`);
    seen.add(id);
    const brand = text(m.brand);
    const display = text(m.display_name);
    if (!brand) return at("brand", "required");
    if (!display) return at("display_name", "required");
    const model = display.toLowerCase().startsWith(brand.toLowerCase() + " ") ? display.slice(brand.length + 1) : display;
    const a = attrById.get(id);
    const primary = text(a?.primary_use) || null;
    const secondary = text(a?.secondary_use_tags).split(";").map((t) => t.trim()).filter(Boolean);
    const tags = [...new Set([primary, ...secondary].filter((t): t is string => Boolean(t)))];
    const active = text(m.market).toUpperCase() === "KR" && bool(m.kr_sale_confirmed) && text(m.product_status).toUpperCase() === "CURRENT";
    const image = imageById.get(id) ?? null;
    products.push({
      id,
      brand,
      brand_ko: text(m.brand_ko) || null,
      model_name: model,
      display_name: display,
      primary_use: primary,
      tags,
      official_url: https(m.official_product_url),
      image_url: image,
      image_approved: image != null,
      active,
    });
  });
  return { products, issues };
}

/** Template CSV/Excel: runner_id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, weekly_distance, data_source */
export function runnersFromRows(rows: Row[]): { runners: SeedRunner[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const runners: SeedRunner[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const at = (field: string, message: string) => issues.push({ sheet: "seed_runners", row: i + 1, field, message });
    const id = text(r.runner_id);
    const h = num(r.height_cm), w = num(r.weight_kg), f = num(r.shoe_size_mm);
    const dist = code(DISTANCE_CODES, r.typical_run_distance) as SeedRunner["typical_run_distance"] | null;
    const weekly = text(r.weekly_distance) ? code(WEEKLY_CODES, r.weekly_distance) : null;
    const source = text(r.data_source).toLowerCase();
    let ok = true;
    const bad = (field: string, message: string) => { at(field, message); ok = false; };
    if (!id || id.length > 40) bad("runner_id", "required (≤ 40 chars)");
    else if (seen.has(id)) bad("runner_id", `duplicate runner ${id}`);
    if (h == null || Number.isNaN(h) || h < 100 || h > 230) bad("height_cm", `must be 100–230 (got "${text(r.height_cm)}")`);
    if (w == null || Number.isNaN(w) || w < 25 || w > 200) bad("weight_kg", `must be 25–200 (got "${text(r.weight_kg)}")`);
    if (f == null || Number.isNaN(f) || f < 200 || f > 330) bad("shoe_size_mm", `must be 200–330 (got "${text(r.shoe_size_mm)}")`);
    if (!dist) bad("typical_run_distance", `unknown value "${text(r.typical_run_distance)}" (LT_3 / D3_5 / D5_10 / GTE_10)`);
    if (text(r.weekly_distance) && !weekly) bad("weekly_distance", `unknown value "${text(r.weekly_distance)}"`);
    if (!(SOURCES as readonly string[]).includes(source)) bad("data_source", `must be one of ${SOURCES.join(" / ")}`);
    if (!ok) return;
    seen.add(id);
    runners.push({ id, height_cm: h!, weight_kg: w!, shoe_size_mm: f!, typical_run_distance: dist!, weekly_distance: weekly, data_source: source as SeedRunner["data_source"] });
  });
  return { runners, issues };
}

/** Template: runner_id, product_id, run_count (optional), total_km (optional) */
export function runnerShoesFromRows(rows: Row[], runnerIds: Set<string>, productIds: Set<string>): { shoes: SeedRunnerShoe[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const shoes: SeedRunnerShoe[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const at = (field: string, message: string) => issues.push({ sheet: "seed_runner_shoes", row: i + 1, field, message });
    const rid = text(r.runner_id), pid = text(r.product_id);
    const rc = num(r.run_count), km = num(r.total_km);
    if (!runnerIds.has(rid)) return at("runner_id", `unknown runner "${rid}"`);
    if (!productIds.has(pid)) return at("product_id", `unknown product "${pid}"`);
    const key = `${rid}|${pid}`;
    if (seen.has(key)) return at("product_id", `duplicate pair ${rid} / ${pid} (a runner counts once per shoe)`);
    if (rc != null && (Number.isNaN(rc) || rc < 0 || !Number.isInteger(rc))) return at("run_count", "must be a whole number ≥ 0");
    if (km != null && (Number.isNaN(km) || km < 0)) return at("total_km", "must be ≥ 0");
    seen.add(key);
    shoes.push({ runner_id: rid, product_id: pid, run_count: rc, total_km: km == null ? null : Math.round(km * 10) / 10 });
  });
  return { shoes, issues };
}

// ── SQL output (server import via SQL Editor) ───────────────────────────────

const q = (v: string | null) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `array[${xs.map((x) => q(x)).join(", ")}]::text[]`;

/** A catalogue product without the `active` flag (the app only ever receives active products). */
export const toAppProduct = (p: CatalogProduct): Product => {
  const { active, ...rest } = p;
  void active;
  return rest;
};

export function productsSql(products: CatalogProduct[]): string {
  const values = products
    .map((p) => `  (${q(p.id)}, ${q(p.brand)}, ${q(p.brand_ko)}, ${q(p.model_name)}, ${q(p.display_name)}, ${q(p.primary_use)}, ${arr(p.tags)}, ${q(p.official_url)}, ${q(p.image_url)}, ${p.image_approved}, ${p.active}, 'catalog')`)
    .join(",\n");
  return `insert into public.products (id, brand, brand_ko, model_name, display_name, primary_use, tags, official_url, image_url, image_approved, active, data_source) values
${values}
on conflict (id) do update set brand = excluded.brand, brand_ko = excluded.brand_ko, model_name = excluded.model_name,
  display_name = excluded.display_name, primary_use = excluded.primary_use, tags = excluded.tags, official_url = excluded.official_url,
  image_url = excluded.image_url, image_approved = excluded.image_approved, active = excluded.active;`;
}

export function runnersSql(runners: SeedRunner[], shoes: SeedRunnerShoe[]): string {
  if (runners.some((r) => r.data_source === "demo")) throw new Error("DEMO runners must not be imported into the server database");
  const rv = runners
    .map((r) => `  (${q(r.id)}, ${r.height_cm}, ${r.weight_kg}, ${r.shoe_size_mm}, ${q(r.typical_run_distance)}, ${q(r.weekly_distance)}, ${q(r.data_source)})`)
    .join(",\n");
  const sv = shoes.map((s) => `  (${q(s.runner_id)}, ${q(s.product_id)}, ${s.run_count ?? "null"}, ${s.total_km ?? "null"})`).join(",\n");
  return [
    runners.length
      ? `insert into public.seed_runners (id, height_cm, weight_kg, shoe_size_mm, typical_run_distance, weekly_distance, data_source) values\n${rv}\non conflict (id) do update set height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, shoe_size_mm = excluded.shoe_size_mm, typical_run_distance = excluded.typical_run_distance, weekly_distance = excluded.weekly_distance, data_source = excluded.data_source;`
      : "",
    shoes.length
      ? `insert into public.seed_runner_shoes (runner_id, product_id, run_count, total_km) values\n${sv}\non conflict (runner_id, product_id) do update set run_count = excluded.run_count, total_km = excluded.total_km;`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

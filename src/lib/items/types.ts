// ITEMS data shapes — mirror supabase/migrations/20261014000000_items.sql.

export interface Product {
  id: string; // e.g. "GM-NK-PEGASUS-42" (Product DB v0.3 product_id)
  brand: string;
  brand_ko: string | null;
  model_name: string;
  display_name: string;
  primary_use: string | null; // DAILY / LONG / RACE / …
  tags: string[];
  official_url: string | null;
  image_url: string | null;
  image_approved: boolean; // only approved images are shown; otherwise the placeholder
}

/** A sample runner — body data stays server-side; locally only in the DEMO file. */
export interface SeedRunner {
  id: string;
  height_cm: number;
  weight_kg: number;
  shoe_size_mm: number;
  typical_run_distance: "LT_3" | "D3_5" | "D5_10" | "GTE_10";
  weekly_distance: string | null;
  data_source: "survey" | "partner" | "internal" | "demo";
}

export interface SeedRunnerShoe {
  runner_id: string;
  product_id: string;
  run_count: number | null;
  total_km: number | null;
}

export interface ItemsDataset {
  products: Product[];
  runners: SeedRunner[];
  runner_shoes: SeedRunnerShoe[];
}

export type Range = "base" | "wide";

export interface ShoeShare {
  product_id: string;
  brand: string;
  model_name: string;
  display_name: string;
  primary_use: string | null;
  tags: string[];
  image_url: string | null;
  image_approved: boolean;
  runners: number; // distinct similar runners using it (X)
  share: number; // X / N, 0..1 (4 decimals)
  run_count: number | null; // Σ run_count of those runners (null when no data)
  total_km: number | null;
}

export interface RunnersLikeYou {
  status: "ok" | "insufficient" | "profile_missing";
  range: Range;
  runners: number | null; // N (distinct), null when the profile is missing
  min_runners: number;
  demo: boolean; // any matched runner is DEMO data
  items: ShoeShare[]; // empty unless status = ok
}

/** The four fields used for matching — from the user's own runner profile. */
export interface MatchProfile {
  height_cm: number | null;
  weight_kg: number | null;
  shoe_size_mm: number | null;
  typical_run_distance: string | null;
}

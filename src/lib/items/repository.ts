// ITEMS data access. Screens talk ONLY to `itemsRepository`.
//   server: Supabase — products (read), items_match() (aggregate / example / browse), saved_products (RLS own rows)
//   local : DEMO dataset file only when NEXT_PUBLIC_ITEMS_DEMO=1 (local testing); otherwise an empty catalogue,
//           so the screens show the real "not enough runners" states — never invented numbers.
import { STORAGE_MODE } from "@/lib/config";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";
import { itemsMatch } from "./aggregate";
import type { ItemsDataset, ItemsMatch, MatchProfile, Product } from "./types";

/** Local DEMO switch — never on in server mode. The file is generated locally and git-ignored. */
export const ITEMS_DEMO = STORAGE_MODE === "local" && process.env.NEXT_PUBLIC_ITEMS_DEMO === "1";
export const DEMO_DATA_URL = "/demo-data/items-demo.json";

export interface SavedProduct {
  product: Product;
  saved_at: string;
}

export interface ItemsRepository {
  readonly kind: "server" | "local-demo" | "local-empty";
  /** `profile` is used by the local implementation; the server reads the caller's own stored profile. */
  itemsMatch(profile: MatchProfile): Promise<ItemsMatch>;
  product(id: string): Promise<Product | null>;
  saved(): Promise<SavedProduct[]>;
  save(productId: string): Promise<void>;
  unsave(productId: string): Promise<void>;
}

// ── server ──────────────────────────────────────────────────────────────────

const PRODUCT_COLS = "id, brand, brand_ko, model_name, display_name, primary_use, tags, official_url, image_url, image_approved";

function db() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

export const serverItemsRepository: ItemsRepository = {
  kind: "server",
  async itemsMatch() {
    await ensureUserId();
    const { data, error } = await db().rpc("items_match");
    if (error) throw error;
    const r = data as ItemsMatch;
    // numeric columns arrive as strings; DEMO / browse items keep null numbers
    return { ...r, items: (r.items ?? []).map((i) => ({ ...i, share: i.share == null ? null : Number(i.share), total_km: i.total_km == null ? null : Number(i.total_km) })) };
  },
  async product(id) {
    await ensureUserId();
    const { data, error } = await db().from("products").select(PRODUCT_COLS).eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as Product) ?? null;
  },
  async saved() {
    await ensureUserId();
    const { data, error } = await db().from("saved_products").select(`saved_at, products(${PRODUCT_COLS})`).order("saved_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as { saved_at: string; products: Product | null }[])
      .filter((r) => r.products)
      .map((r) => ({ product: r.products!, saved_at: r.saved_at }));
  },
  async save(productId) {
    await ensureUserId();
    const { error } = await db().from("saved_products").upsert({ product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    if (error) throw error;
  },
  async unsave(productId) {
    await ensureUserId();
    const { error } = await db().from("saved_products").delete().eq("product_id", productId);
    if (error) throw error;
  },
};

// ── local ───────────────────────────────────────────────────────────────────

const EMPTY: ItemsDataset = { products: [], runners: [], runner_shoes: [] };
let datasetPromise: Promise<ItemsDataset> | null = null;

function loadDataset(): Promise<ItemsDataset> {
  if (!ITEMS_DEMO) return Promise.resolve(EMPTY);
  datasetPromise ??= fetch(DEMO_DATA_URL)
    .then((r) => (r.ok ? (r.json() as Promise<ItemsDataset>) : EMPTY))
    .catch(() => EMPTY); // file missing → behave exactly like an empty catalogue
  return datasetPromise;
}

const SAVED_KEY = "gearmatch.saved.v1"; // temporary, this browser only
function readSaved(): { id: string; at: string }[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeSaved(list: { id: string; at: string }[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked */
  }
}

export const localItemsRepository: ItemsRepository = {
  kind: ITEMS_DEMO ? "local-demo" : "local-empty",
  async itemsMatch(profile) {
    return itemsMatch(await loadDataset(), profile);
  },
  async product(id) {
    return (await loadDataset()).products.find((p) => p.id === id) ?? null;
  },
  async saved() {
    const products = new Map((await loadDataset()).products.map((p) => [p.id, p]));
    return readSaved()
      .filter((s) => products.has(s.id))
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((s) => ({ product: products.get(s.id)!, saved_at: s.at }));
  },
  async save(productId) {
    const list = readSaved();
    if (!list.some((s) => s.id === productId)) writeSaved([...list, { id: productId, at: new Date().toISOString() }]);
  },
  async unsave(productId) {
    writeSaved(readSaved().filter((s) => s.id !== productId));
  },
};

export const itemsRepository: ItemsRepository = STORAGE_MODE === "server" ? serverItemsRepository : localItemsRepository;

// Where user data is stored.
//   NEXT_PUBLIC_DATA_MODE=real + Supabase env → "server" (anonymous Supabase user, RLS-protected tables)
//   anything else (default "demo")           → "local"  (this browser's localStorage only — temporary)
// Set at build time; never infer "server" from the env vars alone.
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type StorageMode = "server" | "local";

export const DATA_MODE: "real" | "demo" = process.env.NEXT_PUBLIC_DATA_MODE === "real" ? "real" : "demo";

export const STORAGE_MODE: StorageMode = DATA_MODE === "real" && isSupabaseConfigured() ? "server" : "local";

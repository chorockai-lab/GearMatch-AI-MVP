// Supabase browser client. Returns null until the env vars are set — the app then stays on local storage.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  return cached;
}

export const isSupabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let pending: Promise<string> | null = null;

/**
 * Returns the signed-in user id, creating an anonymous user on first use.
 * Concurrent callers share one sign-in (otherwise each would create its own anonymous user).
 * The session lives in this browser only — another browser / cleared site data = a new user (no recovery in MVP).
 */
export function ensureUserId(): Promise<string> {
  const sb = getSupabase();
  if (!sb) return Promise.reject(new Error("Supabase is not configured"));
  if (pending) return pending;
  pending = (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: signed, error } = await sb.auth.signInAnonymously();
    if (error || !signed.user) throw error ?? new Error("anonymous sign-in failed");
    return signed.user.id;
  })();
  pending.catch(() => {
    pending = null; // allow a retry after a network failure
  });
  return pending;
}

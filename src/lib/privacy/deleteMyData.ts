// Privacy P-2: delete everything this browser's anonymous account owns (docs/PRIVACY_DELETE.md).
//   server mode → database function public.delete_my_data(): takes no user id, deletes the CALLER's own account and rows
//                 (identity · profile · runs · saved shoes · events), then this browser signs out and forgets its local data
//   local mode  → the data only lives in this browser's storage, so forgetting it is the deletion
// No service role key is involved. A browser without a session is never signed in just to delete.
import { STORAGE_MODE } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";

export type DeleteResult = "deleted" | "nothing" | "failed";

/** QA marker and analytics choice are settings, not personal data — kept so a QA browser stays excluded from analytics. */
const KEEP = new Set(["gearmatch.qa", "gearmatch.analytics"]);

/** Storage keys of this app's data to forget after a deletion. */
export function keysToForget(keys: string[]): string[] {
  return keys.filter((k) => k.startsWith("gearmatch.") && !KEEP.has(k));
}

function forgetLocal(): void {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((k): k is string => k !== null);
      for (const k of keysToForget(keys)) store.removeItem(k);
    } catch {
      // storage unavailable (private mode quirks) — nothing stored to forget
    }
  }
}

export async function deleteMyData(): Promise<DeleteResult> {
  if (STORAGE_MODE === "local") {
    forgetLocal();
    return "deleted";
  }
  const sb = getSupabase();
  if (!sb) return "failed";
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      forgetLocal();
      return "nothing";
    }
    const { error } = await sb.rpc("delete_my_data");
    if (error) return "failed";
    // The account no longer exists; supabase-js ignores the server's 403/404 and always removes this browser's session.
    await sb.auth.signOut({ scope: "local" });
    forgetLocal();
    return "deleted";
  } catch {
    return "failed";
  }
}

// Privacy P-2: delete everything this browser's anonymous account owns (docs/PRIVACY_DELETE.md).
//   server mode → database function public.delete_my_data(): takes no user id, deletes the CALLER's own account and rows
//                 (identity · profile · runs · saved shoes · events), then this browser signs out and forgets its local data
//   local mode  → the data only lives in this browser's storage, so forgetting it is the deletion
// No service role key is involved. A browser without a session is never signed in just to delete.
import { STORAGE_MODE } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";
import { flagPostHogDeletion } from "@/lib/analytics/posthog";
import { isQaSession } from "@/lib/events/track";

export type DeleteResult = "deleted" | "nothing" | "failed";

/** The QA marker is a setting, not personal data — kept so a QA browser stays excluded from analytics. The PostHog consent
 * is forgotten: its Supabase record is deleted with the account, so the next account must agree again. */
const KEEP = new Set(["gearmatch.qa"]);

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
    // PostHog copy of the usage events (if any): flag the person for the operator to delete — before the account is gone
    await flagPostHogDeletion(data.session.user.id, isQaSession());
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

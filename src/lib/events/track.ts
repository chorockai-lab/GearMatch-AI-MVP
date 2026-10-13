// Product event collection (success metrics, spec §8: test start → completion, Reveal reached,
// Runner Card completed, first run, revisit, ITEMS entry).
//   • server mode: append-only insert into `events` (RLS: own rows). Fire-and-forget — never blocks or breaks the UI.
//   • local mode : not sent anywhere (demo builds collect nothing).
//   • Props must not contain personal data (no body measurements, no free text). Keep values small.
import { STORAGE_MODE } from "@/lib/config";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";

export const EVENT_NAMES = [
  "app_open", // once per browser session (revisit metric)
  "landing_view",
  "test_start",
  "test_complete",
  "reveal_view",
  "profile_habits_complete",
  "profile_runner_complete",
  "profile_runner_skip",
  "onboarding_complete",
  "running_view",
  "run_save_success",
  "run_save_fail",
  "run_update",
  "run_delete",
  "history_view",
  "stats_view",
  "stats_detail_view",
  "items_view",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

type Props = Record<string, string | number | boolean | null>;

export function track(name: EventName, props: Props = {}): void {
  if (STORAGE_MODE !== "server" || typeof window === "undefined") return;
  const sb = getSupabase();
  if (!sb) return;
  const row = { name, props, path: window.location.pathname.slice(0, 200), client_at: new Date().toISOString() };
  void ensureUserId()
    .then(() => sb.from("events").insert(row))
    .then((r) => {
      if (r.error && process.env.NODE_ENV !== "production") console.warn("[track]", name, r.error.message);
    })
    .catch(() => {
      /* analytics must never affect the user flow */
    });
}

/** Sends `app_open` at most once per browser session. */
export function trackAppOpen(): void {
  try {
    if (window.sessionStorage.getItem("gearmatch.app_open")) return;
    window.sessionStorage.setItem("gearmatch.app_open", "1");
  } catch {
    /* storage blocked → still count once per page load */
  }
  track("app_open");
}

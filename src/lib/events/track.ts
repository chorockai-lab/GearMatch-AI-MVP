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
  "test_question_view", // props: { q: 1..5 } — drop-off by question; answers are never sent
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

const QA_KEY = "gearmatch.qa";
/**
 * Internal QA sessions: open any page with `?qa=1` (and `?qa=0` to stop). Events from such a browser carry
 * `qa: true` so analytics queries can exclude them (docs/ANALYTICS_QUERIES.md).
 */
function isQaSession(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get("qa");
    if (flag === "1") window.localStorage.setItem(QA_KEY, "1");
    if (flag === "0") window.localStorage.removeItem(QA_KEY);
    return window.localStorage.getItem(QA_KEY) === "1";
  } catch {
    return false;
  }
}

export function track(name: EventName, props: Props = {}): void {
  if (STORAGE_MODE !== "server" || typeof window === "undefined") return;
  const sb = getSupabase();
  if (!sb) return;
  const row = { name, props: isQaSession() ? { ...props, qa: true } : props, path: window.location.pathname.slice(0, 200), client_at: new Date().toISOString() };
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

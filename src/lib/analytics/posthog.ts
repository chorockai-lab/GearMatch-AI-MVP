// PostHog — a second destination for the SAME product events as Supabase `events` (src/lib/events/track.ts).
//   • Gated by NEXT_PUBLIC_POSTHOG_ENABLED (off | qa | consent | all) + token + host. Missing config = nothing loads.
//     consent = opt-in, all = opt-out; the choice is made on /privacy (AnalyticsChoice) and kept in this browser.
//   • The SDK is loaded lazily only when an event may be sent (no cost for everyone else).
//   • No autocapture, pageview/pageleave, session replay, heatmaps, dead clicks, surveys, flags or exceptions.
//   • distinct_id = the Supabase anonymous user id → one person per browser user across both systems.
//   • Failures are swallowed: PostHog can never break the app or the Supabase event write.
import type { PostHog } from "posthog-js";
import { mayHaveSent, resolveMode, sanitizeProps, scrubEventProperties, shouldSend, type AnalyticsChoice, type PostHogMode } from "./posthog-policy";

export const POSTHOG_MODE: PostHogMode = resolveMode(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED,
);

const CONSENT_KEY = "gearmatch.analytics"; // "granted" | "denied" — the choice made on /privacy (none = never chosen)

/** This browser's choice about PostHog usage statistics. */
export function analyticsChoice(): AnalyticsChoice {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Saves the choice from /privacy and applies it at once (a loaded SDK stops / resumes sending). */
export function setAnalyticsConsent(choice: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* storage blocked — the choice lasts for this page only */
  }
  void loaded?.then((ph) => {
    if (!ph) return;
    if (choice === "denied") ph.opt_out_capturing();
    else if (ph.has_opted_out_capturing()) ph.opt_in_capturing({ captureEventName: false });
  });
}

let loaded: Promise<PostHog | null> | null = null;
let identified: string | null = null;

function load(): Promise<PostHog | null> {
  loaded ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_performance: false,
        rageclick: false,
        disable_surveys: true,
        advanced_disable_flags: true,
        person_profiles: "identified_only",
        persistence: "localStorage",
        save_referrer: false,
        before_send: (event) => (event ? { ...event, properties: scrubEventProperties(event.properties) } : event),
      });
      return posthog;
    })
    .catch(() => null);
  return loaded;
}

/** Sends one product event (already deduplicated by the caller) to PostHog when allowed. Never throws. */
export function capturePostHog(name: string, props: Record<string, unknown>, userId: string, isQa: boolean): void {
  if (typeof window === "undefined" || !shouldSend(POSTHOG_MODE, isQa, analyticsChoice())) return;
  void load()
    .then((ph) => {
      if (!ph) return;
      if (identified !== userId) {
        ph.identify(userId);
        identified = userId;
        // person-level QA mark too, so "Filter out internal and test users" can drop a QA browser's earlier events
        if (isQa) ph.setPersonProperties({ qa: true });
      }
      if (isQa) ph.register({ qa: true });
      ph.capture(name, sanitizeProps({ ...props, ...(isQa ? { qa: true } : {}) }));
    })
    .catch(() => {
      /* analytics must never affect the user flow */
    });
}

/**
 * "내 데이터 삭제": PostHog has no client-side delete, so the person is flagged (`gm_deletion_requested`) for the
 * operator to delete in PostHog (docs/POSTHOG.md), then this browser forgets its PostHog identity.
 * Runs only if PostHog may hold events from this browser; never throws, never blocks the deletion for long.
 */
export async function flagPostHogDeletion(userId: string, isQa: boolean): Promise<void> {
  if (typeof window === "undefined" || !mayHaveSent(POSTHOG_MODE, isQa, analyticsChoice())) return;
  const work = load().then((ph) => {
    if (!ph) return;
    const optedOut = ph.has_opted_out_capturing();
    if (optedOut) ph.opt_in_capturing({ captureEventName: false }); // only to deliver the deletion flag
    if (ph.get_distinct_id() !== userId) ph.identify(userId);
    ph.capture("$set", {}, { $set: { gm_deletion_requested: true, gm_deletion_requested_at: new Date().toISOString().slice(0, 10) }, send_instantly: true });
    ph.reset();
    identified = null;
    if (optedOut) ph.opt_out_capturing();
  });
  await Promise.race([work.catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
}

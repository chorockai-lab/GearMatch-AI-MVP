// PostHog — a second destination for the SAME product events as Supabase `events` (src/lib/events/track.ts).
//   • Gated by NEXT_PUBLIC_POSTHOG_ENABLED (off | qa | consent | all) + token + host. Missing config = nothing loads.
//     consent = opt-in, all = opt-out; the choice is made on /privacy (AnalyticsChoice) and kept in this browser.
//   • The SDK is loaded lazily only when an event may be sent (no cost for everyone else).
//   • No autocapture, pageview/pageleave, session replay, heatmaps, dead clicks, surveys, flags or exceptions.
//   • distinct_id = the Supabase anonymous user id → one person per browser user across both systems.
//   • Failures are swallowed: PostHog can never break the app or the Supabase event write.
import type { PostHog } from "posthog-js";
import {
  effectiveChoice,
  mayHaveSent,
  NO_CONSENT,
  resolveMode,
  sanitizeProps,
  scrubEventProperties,
  shouldSend,
  SUPABASE_ONLY_EVENTS,
  type AnalyticsChoice,
  type ConsentState,
  type ConsentValue,
  type PostHogMode,
} from "./posthog-policy";

export const POSTHOG_MODE: PostHogMode = resolveMode(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED,
);

const CONSENT_KEY = "gearmatch.analytics"; // JSON ConsentState — the two optional consents (landing · /privacy)
const SENT_KEY = "gearmatch.analytics_sent"; // "1" once this browser captured to PostHog — cleared by deletion / withdrawal

const asValue = (v: unknown): ConsentValue => (v === "granted" || v === "denied" ? v : null);

/** The stored consents as they are (may refer to an older notice version). */
export function consentState(): ConsentState {
  try {
    const v = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "null");
    if (v && typeof v === "object") return { stats: asValue(v.stats), transfer: asValue(v.transfer), version: typeof v.version === "string" ? v.version : null };
  } catch {
    /* storage blocked or old format */
  }
  return NO_CONSENT;
}

/** The effective choice for sending (both consents under the current notice version). */
export function analyticsChoice(): AnalyticsChoice {
  return effectiveChoice(consentState());
}

function sentBefore(): boolean {
  try {
    return window.localStorage.getItem(SENT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Stores the consents and applies them at once to a loaded SDK. Use lib/analytics/consent.ts (it also records them). */
export function saveConsentState(next: ConsentState): { before: AnalyticsChoice; after: AnalyticsChoice } {
  const before = analyticsChoice();
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — lasts for this page only */
  }
  const after = analyticsChoice();
  const sending = shouldSend(POSTHOG_MODE, false, after);
  void loaded?.then((ph) => {
    if (!ph) return;
    if (!sending) ph.opt_out_capturing();
    else if (ph.has_opted_out_capturing()) ph.opt_in_capturing({ captureEventName: false });
  });
  return { before, after };
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
  if (typeof window === "undefined" || SUPABASE_ONLY_EVENTS.has(name) || !shouldSend(POSTHOG_MODE, isQa, analyticsChoice())) return;
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
      try {
        window.localStorage.setItem(SENT_KEY, "1");
      } catch {
        /* storage blocked */
      }
      ph.capture(name, sanitizeProps({ ...props, ...(isQa ? { qa: true } : {}) }));
    })
    .catch(() => {
      /* analytics must never affect the user flow */
    });
}

/**
 * "내 데이터 삭제": PostHog has no client-side delete, so the person is flagged (`gm_deletion_requested`) for the
 * operator to delete in PostHog, then this browser forgets its PostHog identity. Best effort only (ad blocker, network,
 * 1.5 s limit) — the operator's reconciliation in docs/POSTHOG.md also deletes PostHog persons whose Supabase account
 * no longer exists. Runs only if PostHog really received events from this browser; never throws.
 */
export async function flagPostHogDeletion(userId: string, isQa: boolean, reason: "deleted" | "withdrawn" = "deleted"): Promise<void> {
  if (typeof window === "undefined" || !mayHaveSent(POSTHOG_MODE, isQa, sentBefore())) return;
  const work = load().then((ph) => {
    if (!ph) return;
    const optedOut = ph.has_opted_out_capturing();
    if (optedOut) ph.opt_in_capturing({ captureEventName: false }); // only to deliver the deletion flag
    if (ph.get_distinct_id() !== userId) ph.identify(userId);
    ph.capture("$set", {}, { $set: { gm_deletion_requested: true, gm_deletion_reason: reason, gm_deletion_requested_at: new Date().toISOString().slice(0, 10) }, send_instantly: true });
    ph.reset();
    identified = null;
    try {
      window.localStorage.removeItem(SENT_KEY); // PostHog no longer holds anything we have not asked to delete
    } catch {
      /* storage blocked */
    }
    if (optedOut || !shouldSend(POSTHOG_MODE, isQa, analyticsChoice())) ph.opt_out_capturing();
  });
  await Promise.race([work.catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
}

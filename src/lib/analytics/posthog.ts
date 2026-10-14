// PostHog — a second destination for the SAME product events as Supabase `events` (src/lib/events/track.ts).
//   • Gated by NEXT_PUBLIC_POSTHOG_ENABLED (off | qa | all) + token + host. Missing config = nothing loads.
//   • The SDK is loaded lazily only when an event may be sent (no cost for everyone else).
//   • No autocapture, pageview/pageleave, session replay, heatmaps, dead clicks, surveys, flags or exceptions.
//   • distinct_id = the Supabase anonymous user id → one person per browser user across both systems.
//   • Failures are swallowed: PostHog can never break the app or the Supabase event write.
import type { PostHog } from "posthog-js";
import { resolveMode, sanitizeProps, scrubEventProperties, shouldSend, type PostHogMode } from "./posthog-policy";

export const POSTHOG_MODE: PostHogMode = resolveMode(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED,
);

const CONSENT_KEY = "gearmatch.analytics"; // "denied" = opted out of PostHog (used when mode = "all")

/** For a future privacy / consent control. Has no visible UI yet. */
export function setAnalyticsConsent(choice: "granted" | "denied"): void {
  try {
    if (choice === "denied") window.localStorage.setItem(CONSENT_KEY, "denied");
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* storage blocked */
  }
  if (choice === "denied") void loaded?.then((ph) => ph?.opt_out_capturing());
}

function isDenied(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "denied";
  } catch {
    return false;
  }
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
  if (typeof window === "undefined" || !shouldSend(POSTHOG_MODE, isQa, isDenied())) return;
  void load()
    .then((ph) => {
      if (!ph) return;
      if (identified !== userId) {
        ph.identify(userId);
        identified = userId;
      }
      if (isQa) ph.register({ qa: true });
      ph.capture(name, sanitizeProps({ ...props, ...(isQa ? { qa: true } : {}) }));
    })
    .catch(() => {
      /* analytics must never affect the user flow */
    });
}

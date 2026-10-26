// The two optional PostHog consents (이용 통계 분석 · 미국 국외 이전), set on /privacy (docs/POSTHOG.md). The Landing only
// informs ("서비스 개선을 위해 이용 기록을 분석합니다.") — viewing it or starting the test is never treated as consent.
// Records made on the Landing before 2026-10-26 keep source "landing".
//   • stored in this browser (lib/analytics/posthog.ts) and applied at once — PostHog sends only when both are granted
//   • every change is recorded in Supabase `events` as `analytics_consent` via trackReliable() — queued and retried until
//     Supabase confirms it; PostHog sends nothing while a record is unconfirmed (choices · notice version · source; the row's
//     time and anonymous user id come with it). Users can add rows but cannot edit or delete them (RLS: insert own only);
//     "내 데이터 삭제" removes them together with the account. Never sent to PostHog.
//   • withdrawing after PostHog already received events flags the PostHog person for deletion (gm_deletion_reason: withdrawn)
import { isQaSession, trackReliable } from "@/lib/events/track";
import { ensureUserId } from "@/lib/supabase/client";
import { consentState, flagPostHogDeletion, NOTICE_VERSION, POSTHOG_MODE, saveConsentState } from "./posthog";
import { carryOverConsent, shouldSend, type ConsentItem, type ConsentState } from "./posthog-policy";

export type ConsentSource = "landing" | "privacy";

/** The consents that count now: a consent given to an older notice version is treated as not given; a refusal stays. */
export function currentConsent(): ConsentState {
  return carryOverConsent(consentState(), NOTICE_VERSION);
}

export function setConsent(items: Partial<Record<ConsentItem, "granted" | "denied">>, source: ConsentSource): ConsentState {
  const next: ConsentState = { ...currentConsent(), ...items, version: NOTICE_VERSION };
  const { before, after } = saveConsentState(next);
  void trackReliable("analytics_consent", { stats: next.stats, transfer: next.transfer, version: next.version, source });
  // stopped sending (consent withdrawn, or opted out in all mode) → ask PostHog-side deletion of what was already sent
  if (shouldSend(POSTHOG_MODE, false, before) && !shouldSend(POSTHOG_MODE, false, after) && !isQaSession()) {
    void ensureUserId()
      .then((id) => flagPostHogDeletion(id, false, "withdrawn"))
      .catch(() => undefined);
  }
  return next;
}

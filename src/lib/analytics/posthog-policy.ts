// What may go to PostHog — pure functions (unit-tested in scripts/test-analytics.ts).
// The event names and props are the same as the Supabase `events` rows (src/lib/events/track.ts);
// this file only narrows them further for a third-party processor.

/**
 * off: nothing is sent · qa: only internal QA sessions (`?qa=1`)
 * consent: QA sessions + users who chose "동의" on /privacy (nothing is sent before that choice)
 * all: every user except those who chose "거부" on /privacy
 * consent / all only after the privacy notice and the legal basis are settled (docs/POSTHOG.md).
 */
export type PostHogMode = "off" | "qa" | "consent" | "all";

/** Effective choice for sending; null = not decided (nothing is sent in consent mode). */
export type AnalyticsChoice = "granted" | "denied" | null;

/**
 * Version of the PostHog part of the privacy notice (purpose · items · 국외 이전 제28조의8 ② items) a consent refers to.
 * Bump it whenever those items change: a consent given to an older version no longer counts, so users must agree again.
 */
export const CONSENT_VERSION = "2026-10-21";

/** The two separate optional consents (landing / privacy page). Both must be granted under CONSENT_VERSION to send. */
export type ConsentItem = "stats" | "transfer";
export type ConsentValue = "granted" | "denied" | null;
export interface ConsentState {
  stats: ConsentValue; // 이용 통계 분석 (제15조 동의)
  transfer: ConsentValue; // 미국 국외 이전 (제28조의8 ① 1호 별도 동의)
  version: string | null; // CONSENT_VERSION when last granted
}
export const NO_CONSENT: ConsentState = { stats: null, transfer: null, version: null };

export function effectiveChoice(c: ConsentState, current: string = CONSENT_VERSION): AnalyticsChoice {
  if (c.stats === "denied" || c.transfer === "denied") return "denied";
  if (c.stats === "granted" && c.transfer === "granted" && c.version === current) return "granted";
  return null; // one item missing, or agreed to an older notice
}

/**
 * The stored choices that still count under the current notice: a consent given to an older version is dropped (must agree
 * again), but a refusal never expires — so the /privacy status matches effectiveChoice() after CONSENT_VERSION changes.
 */
export function carryOverConsent(c: ConsentState, current: string = CONSENT_VERSION): ConsentState {
  if (c.version === current) return c;
  const keep = (v: ConsentValue): ConsentValue => (v === "denied" ? "denied" : null);
  return { stats: keep(c.stats), transfer: keep(c.transfer), version: null };
}

/** Browser queue of must-keep Supabase rows (consent records) not yet confirmed by Supabase — see trackReliable(). */
export const PENDING_EVENTS_KEY = "gearmatch.events_pending";

/** Events kept in Supabase only — never sent to PostHog (the consent record itself). */
export const SUPABASE_ONLY_EVENTS = new Set(["analytics_consent"]);

/**
 * The only events PostHog receives, each with the only props it keeps (2026-10-26: minimum for product-behaviour KPIs —
 * visit, test funnel and drop-off by question, result type, onboarding, first/repeat run, ITEMS, card image, revisit).
 * Every other event (profile details, run edits, history, consent records…) stays in Supabase only. `qa` is always kept.
 */
export const POSTHOG_EVENTS: Readonly<Record<string, readonly string[]>> = {
  app_open: [],
  landing_view: [],
  test_start: [],
  test_question_view: ["q"],
  test_complete: ["animal"],
  reveal_view: ["animal"],
  profile_habits_complete: [],
  onboarding_complete: [],
  running_view: [],
  run_save_success: [],
  stats_view: [],
  items_view: [],
  shoe_detail_view: ["product_id"],
  shoe_save: ["product_id"],
  card_image_create: ["card"],
  card_share_result: ["card", "method", "result"],
};

/** What goes to PostHog for one event: null = not sent at all; otherwise only that event's allowed props (+ qa). */
export function posthogProps(name: string, props: Record<string, unknown>): Record<string, string | number | boolean | null> | null {
  const keep = POSTHOG_EVENTS[name];
  if (!keep || SUPABASE_ONLY_EVENTS.has(name)) return null;
  return sanitizeProps(Object.fromEntries(Object.entries(props).filter(([k]) => k === "qa" || keep.includes(k))));
}

export function resolveMode(token: string | undefined, host: string | undefined, flag: string | undefined): PostHogMode {
  // A PostHog project API key always starts with "phc_". Anything else (a project id, a personal key "phx_", a typo)
  // would be accepted by the ingestion endpoint with HTTP 200 but land in no project — so stay off instead.
  if (!token || !/^phc_[A-Za-z0-9]+$/.test(token) || !host || !/^https:\/\//.test(host)) return "off";
  return flag === "qa" || flag === "consent" || flag === "all" ? flag : "off";
}

/** Whether this browser's events may be sent. Internal QA sessions always send unless PostHog is off. */
export function shouldSend(mode: PostHogMode, isQa: boolean, choice: AnalyticsChoice): boolean {
  if (mode === "off") return false;
  if (isQa) return true;
  if (mode === "consent") return choice === "granted"; // opt-in: nothing before an explicit "동의"
  if (mode === "all") return choice !== "denied"; // opt-out
  return false; // qa
}

/**
 * Whether a data deletion should also flag this browser in PostHog: only when PostHog really received events from it —
 * a QA browser, or one that captured at least once (`sentBefore`, recorded on the first capture). A consent-mode user
 * who never agreed (or refused before anything was sent) causes no PostHog request at all, not even the SDK load.
 */
export function mayHaveSent(mode: PostHogMode, isQa: boolean, sentBefore: boolean): boolean {
  if (mode === "off") return false;
  return isQa || sentBefore;
}

/**
 * Event props allowed to leave our own database. Codes, counts, booleans and catalogue ids only —
 * never body measurements, test answers, free text, the user's shoe name, or URL query values.
 */
export const ALLOWED_PROPS = new Set([
  "qa",
  "q", // test question number 1..5 (no answer text)
  "animal",
  "mixed_signal",
  "mode",
  "experience",
  "runs_per_week",
  "typical_run_distance",
  "height", // booleans: entered or not — never the value
  "weight",
  "foot",
  "interest_distance",
  "shoe_status",
  "shoe_source",
  "state",
  "runs",
  "run_id",
  "is_today",
  "status",
  "range",
  "runners",
  "product_id", // catalogue code (e.g. GM-NK-PEGASUS-42), not the user's typed shoe
  "from",
  "card", // runner | stats (card image)
  "method", // create | share | download | longpress
  "result", // shared | cancelled | failed | started | guide_shown
]);
const BOOLEAN_ONLY = new Set(["height", "weight", "foot", "qa", "mixed_signal", "is_today"]);
const MAX_STRING = 64;

export function sanitizeProps(props: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k)) continue;
    if (BOOLEAN_ONLY.has(k)) {
      if (typeof v === "boolean") out[k] = v;
      continue;
    }
    if (v === null || typeof v === "boolean") out[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string" && v.length <= MAX_STRING && /^[\w.:-]*$/.test(v)) out[k] = v; // codes only: no spaces / free text
  }
  return out;
}

/** "https://x.app/items?range=wide#a" → "https://x.app/items" (query strings and fragments never leave the browser) */
export function stripUrl(value: unknown): unknown {
  if (typeof value !== "string" || !/^https?:\/\//.test(value)) return value;
  try {
    const u = new URL(value);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

/** Applied to every outgoing PostHog event (before_send): strip URL query/fragment from all URL-valued properties. */
export function scrubEventProperties<T extends Record<string, unknown> | undefined>(properties: T): T {
  if (!properties) return properties;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (k === "$set" || k === "$set_once") out[k] = scrubEventProperties(v as Record<string, unknown>);
    else out[k] = stripUrl(v);
  }
  return out as T;
}

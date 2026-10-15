// What may go to PostHog — pure functions (unit-tested in scripts/test-analytics.ts).
// The event names and props are the same as the Supabase `events` rows (src/lib/events/track.ts);
// this file only narrows them further for a third-party processor.

/** off: nothing is sent · qa: only internal QA sessions (`?qa=1`) · all: every user (enable only after the privacy notice / consent decision) */
export type PostHogMode = "off" | "qa" | "all";

export function resolveMode(token: string | undefined, host: string | undefined, flag: string | undefined): PostHogMode {
  // A PostHog project API key always starts with "phc_". Anything else (a project id, a personal key "phx_", a typo)
  // would be accepted by the ingestion endpoint with HTTP 200 but land in no project — so stay off instead.
  if (!token || !/^phc_[A-Za-z0-9]+$/.test(token) || !host || !/^https:\/\//.test(host)) return "off";
  return flag === "qa" || flag === "all" ? flag : "off";
}

/** Whether this browser's events may be sent. `denied` = the user opted out (only meaningful in "all"). */
export function shouldSend(mode: PostHogMode, isQa: boolean, denied: boolean): boolean {
  if (mode === "off") return false;
  if (mode === "qa") return isQa;
  return !denied || isQa;
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

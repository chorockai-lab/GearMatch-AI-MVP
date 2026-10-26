// PostHog policy (src/lib/analytics/posthog-policy.ts). Run: npm run test:analytics
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_PROPS, carryOverConsent, CONSENT_VERSION, effectiveChoice, mayHaveSent, noticeVersion, POSTHOG_EVENTS, posthogProps, resolveMode, sanitizeProps, scrubEventProperties, shouldSend, stripUrl, SUPABASE_ONLY_EVENTS } from "../src/lib/analytics/posthog-policy";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

// ── mode / gating ───────────────────────────────────────────────────────────
const H = "https://us.i.posthog.com";
check(resolveMode(undefined, H, "all") === "off", "no token → off");
check(resolveMode("phc_x", undefined, "all") === "off", "no host → off");
check(resolveMode("phc_x", "http://insecure", "all") === "off", "non-https host → off");
check(resolveMode("phc_x", H, undefined) === "off" && resolveMode("phc_x", H, "yes") === "off", "flag missing / unknown → off");
check(resolveMode("phc_x", H, "qa") === "qa" && resolveMode("phc_x", H, "all", "2026-10-27") === "all" && resolveMode("phc_x", H, "consent") === "consent", "qa / consent / all");
check(resolveMode("phc_x", H, "all") === "consent" && resolveMode("phc_x", H, "all", "2026-13-40") === "consent" && resolveMode("phc_x", H, "all", "27.10.2026") === "consent", "all without a valid start date → runs as consent");
check(noticeVersion("all", "2026-10-27") === "2026-10-27" && noticeVersion("consent", "2026-10-27") === CONSENT_VERSION, "notice version: all start date in all mode, consent version otherwise");
check(effectiveChoice(carryOverConsent({ stats: "granted", transfer: "denied", version: CONSENT_VERSION }, "2026-10-27"), "2026-10-27") === "denied", "switching to all: a refusal under the consent notice is kept");
check(resolveMode("ABCDefgh1234567890abcdefghijklmno", H, "qa") === "off", "token without phc_ (e.g. a project id) → off");
check(resolveMode("phx_personalkey123", H, "qa") === "off", "personal API key (phx_) → off");
check(resolveMode("phc_abc 123", H, "qa") === "off" && resolveMode('"phc_abc"', H, "qa") === "off", "token with spaces / quotes → off");
check(!shouldSend("off", true, null) && !shouldSend("off", false, "granted"), "off never sends (even QA, even granted)");
check(shouldSend("qa", true, null) && !shouldSend("qa", false, null) && !shouldSend("qa", false, "granted"), "qa mode: QA sessions only (a choice does not widen it)");
check(!shouldSend("consent", false, null) && !shouldSend("consent", false, "denied") && shouldSend("consent", false, "granted"), "consent mode: nothing before an explicit 동의, nothing after 거부");
check(shouldSend("consent", true, null) && shouldSend("consent", true, "denied"), "consent mode: QA sessions still send (excluded by the qa filter)");
check(shouldSend("all", false, null) && shouldSend("all", false, "granted") && !shouldSend("all", false, "denied"), "all mode: everyone except opted-out");
check(!mayHaveSent("off", true, true), "deletion flag: never when PostHog is off");
check(!mayHaveSent("qa", false, false) && mayHaveSent("qa", true, false), "deletion flag in qa mode: QA browsers only");
check(!mayHaveSent("consent", false, false), "deletion flag in consent mode: no PostHog request for a user who never sent (no 동의, or 거부 first)");
check(mayHaveSent("consent", false, true), "deletion flag in consent mode: a user who sent before (동의, even if withdrawn later)");
check(!mayHaveSent("all", false, false) && mayHaveSent("all", false, true), "deletion flag in all mode: only browsers that actually sent");
const V = CONSENT_VERSION;
check(effectiveChoice({ stats: null, transfer: null, version: null }) === null, "consent: nothing chosen → not decided (consent mode sends nothing)");
check(effectiveChoice({ stats: "granted", transfer: null, version: V }) === null && effectiveChoice({ stats: null, transfer: "granted", version: V }) === null, "consent: one of the two items only → not decided (nothing sent)");
check(effectiveChoice({ stats: "granted", transfer: "granted", version: V }) === "granted", "consent: both items under the current notice → granted");
check(effectiveChoice({ stats: "granted", transfer: "granted", version: "2000-01-01" }) === null, "consent: agreed to an older notice version → must agree again");
check(effectiveChoice({ stats: "granted", transfer: "denied", version: V }) === "denied" && effectiveChoice({ stats: "denied", transfer: "granted", version: V }) === "denied", "consent: either item withdrawn → denied");
check(!shouldSend("consent", false, effectiveChoice({ stats: "granted", transfer: null, version: V })) && shouldSend("consent", false, effectiveChoice({ stats: "granted", transfer: "granted", version: V })), "consent mode sends only with both consents");
const oldDenied = carryOverConsent({ stats: "denied", transfer: "granted", version: "2000-01-01" });
check(oldDenied.stats === "denied" && oldDenied.transfer === null && effectiveChoice(oldDenied) === "denied", "notice version changed: a refusal stays, an old consent is dropped");
check(JSON.stringify(carryOverConsent({ stats: "granted", transfer: "granted", version: V })) === JSON.stringify({ stats: "granted", transfer: "granted", version: V }), "current notice version: choices kept as they are");
for (const c of [
  { stats: "denied", transfer: "denied", version: "2000-01-01" },
  { stats: "granted", transfer: "denied", version: V },
  { stats: "granted", transfer: "granted", version: "2000-01-01" },
  { stats: null, transfer: null, version: null },
] as const)
  check(effectiveChoice(carryOverConsent(c)) === effectiveChoice(c), `/privacy status = what is sent (${JSON.stringify(c)})`);
check(!shouldSend("all", false, effectiveChoice({ stats: "denied", transfer: null, version: "2000-01-01" })) && shouldSend("all", false, effectiveChoice({ stats: "granted", transfer: null, version: "2000-01-01" })), "all mode: an earlier refusal keeps the browser out; an old or partial consent is no refusal");

// ── props allowlist ─────────────────────────────────────────────────────────
const s = sanitizeProps({
  q: 3,
  animal: "HOR",
  height: true,
  weight: 68, // a value, not a boolean → dropped
  foot: "270", // → dropped
  shoe_status: "known",
  product_id: "GM-NK-PEGASUS-42",
  shoe_label: "Nike Pegasus 42", // not allowed key
  interest_distance: "10K",
  answer_text: "정한 날에는 한 번 달리고 싶어요.", // not allowed key
  from: "detail page with spaces", // free text pattern → dropped
  path: "/items?range=wide", // not allowed key
  runs: 3,
  qa: true,
});
check(s.q === 3 && s.animal === "HOR" && s.height === true && s.runs === 3 && s.qa === true, "codes, counts and booleans kept");
check(!("weight" in s) && !("foot" in s), "body values never sent (only entered true/false)");
check(!("shoe_label" in s) && !("answer_text" in s) && !("path" in s), "unknown keys (shoe name, answer text, path) dropped");
check(!("from" in s), "free text with spaces dropped");
check(s.product_id === "GM-NK-PEGASUS-42" && s.interest_distance === "10K", "catalogue id and codes kept");

// ── minimum events for PostHog ──────────────────────────────────────────────
check(posthogProps("profile_runner_complete", { height: true }) === null && posthogProps("run_update", { run_id: "x" }) === null && posthogProps("analytics_consent", { stats: "granted" }) === null, "PostHog: events outside the minimum set are not sent (profile details, run edits, consent record)");
check(JSON.stringify(posthogProps("profile_habits_complete", { experience: "1y", runs_per_week: 3, qa: true })) === JSON.stringify({ qa: true }), "PostHog: habit answers stay in Supabase; only the step and qa are sent");
check(JSON.stringify(posthogProps("test_question_view", { q: 2 })) === JSON.stringify({ q: 2 }) && JSON.stringify(posthogProps("shoe_save", { product_id: "GM-NK-PEGASUS-42", from: "detail" })) === JSON.stringify({ product_id: "GM-NK-PEGASUS-42" }), "PostHog: only the props each event needs (q, product_id)");
check(Object.values(POSTHOG_EVENTS).flat().every((k) => ALLOWED_PROPS.has(k)), "PostHog: every kept prop passes the value allowlist");
for (const ev of ["app_open", "test_start", "test_question_view", "test_complete", "reveal_view", "profile_habits_complete", "onboarding_complete", "running_view", "run_save_success", "items_view", "shoe_detail_view", "shoe_save"])
  check(ev in POSTHOG_EVENTS, `PostHog: dashboard event ${ev} is sent`);

// ── URL scrubbing (before_send) ─────────────────────────────────────────────
check(stripUrl("https://gear-match-ai-mvp.vercel.app/items?range=wide&qa=1#x") === "https://gear-match-ai-mvp.vercel.app/items", "query and fragment removed");
check(stripUrl("not a url") === "not a url" && stripUrl(5) === 5, "non-URL values untouched");
const scrubbed = scrubEventProperties({ $current_url: "https://a.app/runs/1?token=abc", $referrer: "https://b.com/?q=secret", $set: { $initial_current_url: "https://a.app/?qa=1" }, q: 1 });
check(
  scrubbed.$current_url === "https://a.app/runs/1" && scrubbed.$referrer === "https://b.com/" && (scrubbed.$set as Record<string, unknown>).$initial_current_url === "https://a.app/" && scrubbed.q === 1,
  "every URL property (incl. $set) scrubbed",
);

// ── every prop key used by track() calls is either allowed or explicitly ignored ──
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mts)$/.test(f)) files.push(p);
  }
};
walk("src");
const used = new Set<string>();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?:track|useTrackOnce)\(\s*"([a-z_]+)"\s*,\s*\{([^}]*)\}/g)) {
    if (SUPABASE_ONLY_EVENTS.has(m[1])) continue; // never sent to PostHog
    // keys at the start or after a comma: `key: value` and shorthand `{ card, method }`
    for (const k of m[2].matchAll(/(?:^|,)\s*([a-z_]+)\s*(?=[:,]|\s*$)/g)) used.add(k[1]);
  }
}
const missing = [...used].filter((k) => !ALLOWED_PROPS.has(k));
check(used.size > 10 && missing.length === 0, `all ${used.size} prop keys used by track() are reviewed for PostHog${missing.length ? ` — not allowed: ${missing.join(", ")}` : ""}`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

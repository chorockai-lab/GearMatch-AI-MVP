// PostHog policy (src/lib/analytics/posthog-policy.ts). Run: npm run test:analytics
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_PROPS, resolveMode, sanitizeProps, scrubEventProperties, shouldSend, stripUrl } from "../src/lib/analytics/posthog-policy";

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
check(resolveMode("phc_x", H, "qa") === "qa" && resolveMode("phc_x", H, "all") === "all", "qa / all");
check(resolveMode("ABCDefgh1234567890abcdefghijklmno", H, "qa") === "off", "token without phc_ (e.g. a project id) → off");
check(resolveMode("phx_personalkey123", H, "qa") === "off", "personal API key (phx_) → off");
check(resolveMode("phc_abc 123", H, "qa") === "off" && resolveMode('"phc_abc"', H, "qa") === "off", "token with spaces / quotes → off");
check(!shouldSend("off", true, false), "off never sends (even QA)");
check(shouldSend("qa", true, false) && !shouldSend("qa", false, false), "qa mode: QA sessions only");
check(shouldSend("all", false, false) && !shouldSend("all", false, true), "all mode: everyone except opted-out");

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
  for (const m of src.matchAll(/(?:track|useTrackOnce)\(\s*"[a-z_]+"\s*,\s*\{([^}]*)\}/g)) {
    for (const k of m[1].matchAll(/([a-z_]+)\s*:/g)) used.add(k[1]);
  }
}
const missing = [...used].filter((k) => !ALLOWED_PROPS.has(k));
check(used.size > 10 && missing.length === 0, `all ${used.size} prop keys used by track() are reviewed for PostHog${missing.length ? ` — not allowed: ${missing.join(", ")}` : ""}`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

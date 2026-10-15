// PostHog dashboard definitions (scripts/posthog/dashboards.mjs) — offline checks, no key / network.
// Run: npm run test:analytics (after the policy tests). Schema compatibility with PostHog itself: npm run posthog:check
import { DASHBOARDS } from "./posthog/dashboards.mjs";
import { EVENT_NAMES } from "../src/lib/events/track";
import { ALLOWED_PROPS } from "../src/lib/analytics/posthog-policy";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

type Json = unknown;
const walk = (v: Json, visit: (o: Record<string, Json>) => void) => {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit));
  else if (v && typeof v === "object") {
    visit(v as Record<string, Json>);
    Object.values(v).forEach((x) => walk(x, visit));
  }
};
const known = new Set<string>(EVENT_NAMES);
const qaFilter = (query: Json) => {
  const source = (query as { source: { properties?: { key: string; operator: string }[] } }).source;
  return (source.properties ?? []).find((p) => p.key === "qa")?.operator;
};

const [kpi, qa] = DASHBOARDS;
check(kpi.name === "GearMatch MVP KPI" && kpi.insights.length === 7, "KPI dashboard has the 7 agreed charts");
check(qa.name === "GearMatch QA Monitor" && qa.insights.length > 0, "QA Monitor dashboard defined");
check(kpi.insights.every((i: { query: Json }) => qaFilter(i.query) === "is_not_set"), "every KPI chart excludes QA events (qa is not set)");
check(qa.insights.every((i: { query: Json }) => qaFilter(i.query) === "is_set"), "every QA Monitor chart shows QA events only (qa is set)");

const events = new Set<string>();
const props = new Set<string>();
for (const d of DASHBOARDS)
  for (const i of d.insights)
    walk(i.query, (o) => {
      if (o.kind === "EventsNode" && typeof o.event === "string") events.add(o.event);
      if (typeof o.id === "string" && o.type === "events") events.add(o.id);
      if (o.type === "event" && typeof o.key === "string") props.add(o.key);
    });
const unknownEvents = [...events].filter((e) => !known.has(e));
check(events.size > 10 && unknownEvents.length === 0, `charts use only existing events (${events.size})${unknownEvents.length ? ` — unknown: ${unknownEvents}` : ""}`);
const notAllowed = [...props].filter((p) => !ALLOWED_PROPS.has(p));
check(notAllowed.length === 0, `chart filters use only collected props (${[...props].join(", ")})`);
const names = DASHBOARDS.flatMap((d: { insights: { name: string }[] }) => d.insights.map((i) => i.name));
check(new Set(names).size === names.length, "insight names unique (re-run keeps existing ones by name)");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

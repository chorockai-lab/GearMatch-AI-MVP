// Creates (or completes) the PostHog dashboards defined in dashboards.mjs via the private API:
//   "GearMatch MVP KPI" (QA excluded) and "GearMatch QA Monitor" (QA only).
// Run `npm run posthog:check` first (API compatibility, no key).
//
// Needs a PostHog PERSONAL API key (phx_…) with scopes dashboard:write, insight:write.
// The key is read from the environment or from .env.local (POSTHOG_PERSONAL_API_KEY — .env* is git-ignored) and never printed.
//   PowerShell:  $env:POSTHOG_PERSONAL_API_KEY = "<paste>"; npm run posthog:dashboard; Remove-Item Env:POSTHOG_PERSONAL_API_KEY
// Safe to re-run: a dashboard with the same name is reused, and insights already on it (same name) are kept.
import { readFileSync } from "node:fs";
import { DASHBOARDS } from "./dashboards.mjs";

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* no file → rely on process env */
  }
}
loadEnv(".env.local");

const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID ?? "662151";
const APP = process.env.POSTHOG_APP_HOST ?? "https://us.posthog.com"; // US Cloud private API (not the i. ingestion host)

if (!KEY || !/^phx_[A-Za-z0-9]+$/.test(KEY)) {
  console.log("Set POSTHOG_PERSONAL_API_KEY (a personal API key starting with phx_) in this terminal or in .env.local first.");
  process.exit(2);
}

async function api(method, path, body) {
  const res = await fetch(`${APP}/api/projects/${PROJECT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

let failed = 0;
const allDashboards = (await api("GET", `/dashboards/?limit=200`)).results.filter((d) => !d.deleted);
const allInsights = (await api("GET", `/insights/?limit=500`)).results.filter((i) => !i.deleted);

for (const def of DASHBOARDS) {
  const existing = allDashboards.find((d) => d.name === def.name);
  const dashboard = existing ?? (await api("POST", "/dashboards/", { name: def.name, description: def.description }));
  console.log(`\n${existing ? "existing" : "created"} dashboard #${dashboard.id} "${def.name}"`);

  const have = new Set(allInsights.filter((i) => (i.dashboards ?? []).includes(dashboard.id)).map((i) => i.name));
  for (const ins of def.insights) {
    if (have.has(ins.name)) {
      console.log(`  keep    ${ins.name}`);
      continue;
    }
    try {
      const created = await api("POST", "/insights/", { name: ins.name, description: ins.description, query: ins.query, dashboards: [dashboard.id] });
      console.log(`  created ${ins.name} (#${created.short_id ?? created.id})`);
    } catch (e) {
      failed++;
      console.log(`  FAILED  ${ins.name}: ${e.message}`);
    }
  }
  console.log(`  ${APP}/project/${PROJECT}/dashboard/${dashboard.id}`);
}
process.exit(failed ? 1 : 0);

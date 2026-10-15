// API compatibility check for the PostHog dashboards — run BEFORE `npm run posthog:dashboard`. No key needed.
//   1) PostHog's public OpenAPI schema: the dashboard/insight endpoints and fields we use exist, with the scopes we document
//   2) PostHog's query schema (frontend/src/queries/schema.json, latest): every insight query validates
// Run: npm run posthog:check
import Ajv from "ajv";
import { DASHBOARDS } from "./dashboards.mjs";

const APP = process.env.POSTHOG_APP_HOST ?? "https://us.posthog.com";
const QUERY_SCHEMA = "https://raw.githubusercontent.com/PostHog/posthog/master/frontend/src/queries/schema.json";

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};
const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
};

// ── 1) REST endpoints ───────────────────────────────────────────────────────
const openapi = await getJson(`${APP}/api/schema/?format=json`);
const scopes = (path, method) => (openapi.paths[path]?.[method]?.security ?? []).flatMap((s) => s.PersonalAPIKeyAuth ?? []);
for (const [path, method, scope] of [
  ["/api/projects/{project_id}/dashboards/", "get", "dashboard:read"],
  ["/api/projects/{project_id}/dashboards/", "post", "dashboard:write"],
  ["/api/projects/{project_id}/insights/", "get", "insight:read"],
  ["/api/projects/{project_id}/insights/", "post", "insight:write"],
]) {
  const op = openapi.paths[path]?.[method];
  check(Boolean(op) && !op.deprecated && scopes(path, method).includes(scope), `${method.toUpperCase()} ${path} (scope ${scope})`);
}
const writable = (name) => Object.entries(openapi.components.schemas[name]?.properties ?? {}).filter(([, v]) => !v.readOnly).map(([k]) => k);
check(["name", "description"].every((f) => writable("Dashboard").includes(f)), "Dashboard fields name, description");
check(["name", "description", "query", "dashboards"].every((f) => writable("Insight").includes(f)), "Insight fields name, description, query, dashboards");

// ── 2) insight queries against the query schema ────────────────────────────
const schema = await getJson(QUERY_SCHEMA);
const ajv = new Ajv({ strict: false, validateFormats: false, logger: false });
ajv.addSchema({ $id: "posthog", definitions: schema.definitions });
for (const d of DASHBOARDS) {
  for (const ins of d.insights) {
    const validate = ajv.getSchema(`posthog#/definitions/${ins.query.kind}`);
    const ok = Boolean(validate) && validate(ins.query);
    const why = validate?.errors?.[0] ? ` — ${validate.errors[0].instancePath} ${validate.errors[0].message}` : "";
    check(ok, `[${d.name}] ${ins.name} (${ins.query.source.kind})${ok ? "" : why}`);
  }
}

console.log(failures === 0 ? "\nAPI COMPATIBLE — safe to run npm run posthog:dashboard" : `\n${failures} CHECK(S) FAILED — do not create the dashboards`);
process.exit(failures === 0 ? 0 : 1);

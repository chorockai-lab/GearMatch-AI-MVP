// Supabase connection check — never prints keys or URLs.
// Run: npm run check:supabase   (reads .env.local)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("FAIL  NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  process.exit(1);
}

let fail = 0;
const report = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail++;
};

// 1) auth settings reachable + anonymous sign-ins enabled
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then((r) => r.json()).catch(() => null);
report(Boolean(settings), "auth settings reachable");
report(settings?.external?.anonymous_users === true, `anonymous sign-ins enabled (${settings?.external?.anonymous_users})`);

// 2) anonymous sign-in
const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await sb.auth.signInAnonymously({ options: { data: { qa: "check_supabase" } } });
report(!authErr && Boolean(auth?.user?.id), `anonymous sign-in ${authErr ? "error: " + authErr.message : "ok (is_anonymous=" + auth.user.is_anonymous + ")"}`);

// 3) tables reachable (migration applied?)
// Every column of supabase/migrations/20261013000000_init.sql is selected explicitly, so a missing / renamed
// column (e.g. an older SQL applied by hand) fails here instead of in the app.
const SCHEMA = {
  identity_results: "user_id, animal_type_v2, secondary_type_v2, test_answers_v2, test_schema_version, scoring_version, mixed_signal, evaluated_at, updated_at",
  runner_profiles:
    "user_id, experience, runs_per_week, typical_run_distance, weekly_distance, height_cm, weight_kg, shoe_size_mm, interest_distance, current_shoe_label, current_shoe_status, onboarding_completed_at, updated_at",
  runs: "id, user_id, run_date, distance_km, duration_sec, shoe_label, created_at, updated_at",
  events: "id, user_id, name, props, path, client_at, created_at",
  // STEP 4 (supabase/migrations/20261014000000_items.sql)
  products: "id, brand, brand_ko, model_name, display_name, primary_use, tags, official_url, image_url, image_approved, active, data_source, updated_at",
  saved_products: "user_id, product_id, saved_at",
};
for (const [t, cols] of Object.entries(SCHEMA)) {
  // GET, not HEAD: a HEAD request returns 204 even for tables that do not exist.
  const { error } = await sb.from(t).select(cols).limit(1);
  report(!error, `table ${t} (${cols.split(",").length} columns)${error ? " → " + (error.code ?? "") + " " + error.message : ""}`);
}

// ITEMS: aggregate function callable; sample runner tables closed to clients
const rly = await sb.rpc("runners_like_you", { p_wide: false });
report(!rly.error && typeof rly.data?.status === "string", `runners_like_you() → ${rly.error ? rly.error.message : rly.data.status}`);
for (const t of ["seed_runners", "seed_runner_shoes"]) {
  const r = await sb.from(t).select("*").limit(1);
  report(Boolean(r.error), `${t} not readable by clients (${r.error?.code ?? "readable!"})`);
}
const pc = await sb.from("products").select("id", { count: "exact" }).limit(1);
console.log(`INFO  products visible to the app: ${pc.count ?? 0}`);

// updated_at trigger works (own row, then cleaned up)
const ins = await sb.from("runs").insert({ run_date: "2026-01-01", distance_km: 1, duration_sec: 300 }).select("id, updated_at").single();
if (!ins.error) {
  await new Promise((r) => setTimeout(r, 1100));
  const upd = await sb.from("runs").update({ distance_km: 2 }).eq("id", ins.data.id).select("updated_at").single();
  report(!upd.error && upd.data.updated_at !== ins.data.updated_at, "runs.updated_at trigger updates on edit");
  await sb.from("runs").delete().eq("id", ins.data.id);
} else report(false, `insert test run → ${ins.error.message}`);

await sb.auth.signOut();
console.log(fail ? `\n${fail} problem(s)` : "\nSupabase OK");
process.exit(fail ? 1 : 0);

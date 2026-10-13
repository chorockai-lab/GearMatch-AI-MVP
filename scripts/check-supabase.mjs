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
const { data: auth, error: authErr } = await sb.auth.signInAnonymously();
report(!authErr && Boolean(auth?.user?.id), `anonymous sign-in ${authErr ? "error: " + authErr.message : "ok (is_anonymous=" + auth.user.is_anonymous + ")"}`);

// 3) tables reachable (migration applied?)
for (const t of ["identity_results", "runner_profiles", "runs", "events"]) {
  // GET, not HEAD: a HEAD request returns 204 even for tables that do not exist.
  const { error } = await sb.from(t).select("*").limit(1);
  report(!error, `table ${t}${error ? " → " + (error.code ?? "") + " " + error.message : ""}`);
}

await sb.auth.signOut();
console.log(fail ? `\n${fail} problem(s)` : "\nSupabase OK");
process.exit(fail ? 1 : 0);

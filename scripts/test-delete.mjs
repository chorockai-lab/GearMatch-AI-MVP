// Privacy P-2 check against the real Supabase project — run ONLY after supabase/migrations/20261016000000_delete_my_data.sql
// has been applied (docs/PRIVACY_DELETE.md). Reads .env.local (anon key only; never prints keys; no service role key).
// Creates two throwaway anonymous users A and B (user_metadata.qa = "delete_test"), gives each one row in every table,
// then proves: signed-out callers are refused · B deletes only B · A is untouched · A deletes A.
// Touches no other user: the function can only delete the caller. Both test users delete themselves at the end → no residue.
// Run: npm run test:delete
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of (() => { try { return readFileSync(".env.local", "utf8").split(/\r?\n/); } catch { return []; } })()) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("FAIL  Supabase env not set");
  process.exit(1);
}
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let fail = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail++;
};

const TABLES = ["identity_results", "runner_profiles", "runs", "saved_products", "events"];
const countOwn = async (sb) => {
  const out = {};
  for (const t of TABLES) {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    out[t] = error ? `error:${error.code}` : count;
  }
  return out;
};
const ONE = JSON.stringify({ identity_results: 1, runner_profiles: 1, runs: 1, saved_products: 1, events: 1 });
const ZERO = JSON.stringify({ identity_results: 0, runner_profiles: 0, runs: 0, saved_products: 0, events: 0 });

const seed = async (sb, productId) => {
  const today = new Date().toISOString().slice(0, 10);
  const r = [
    await sb.from("identity_results").upsert({ animal_type_v2: "WOL", secondary_type_v2: "HOR", test_answers_v2: "ABCDE" }),
    await sb.from("runner_profiles").upsert({ experience: "Y1_3", height_cm: 175, weight_kg: 68, shoe_size_mm: 270 }),
    await sb.from("runs").insert({ run_date: today, distance_km: 5, duration_sec: 1800 }),
    await sb.from("saved_products").insert({ product_id: productId }),
    await sb.from("events").insert({ name: "delete_test", props: { qa: true } }),
  ];
  return r.find((x) => x.error)?.error ?? null;
};

const A = client();
const B = client();
const users = {};
try {
  for (const [name, sb] of [["A", A], ["B", B]]) {
    const { data, error } = await sb.auth.signInAnonymously({ options: { data: { qa: "delete_test" } } });
    check(!error && data.user?.is_anonymous === true, `${name}: throwaway anonymous user created`);
    users[name] = data.user?.id;
  }
  const { data: products } = await A.from("products").select("id").limit(1);
  const productId = products?.[0]?.id;
  check(Boolean(productId), "an active product exists for the saved-shoe row");
  for (const [name, sb] of [["A", A], ["B", B]]) {
    const err = await seed(sb, productId);
    check(!err, `${name}: one row in each of ${TABLES.join(", ")}${err ? " · " + err.message : ""}`);
  }
  check(JSON.stringify(await countOwn(A)) === ONE && JSON.stringify(await countOwn(B)) === ONE, "A and B each see their own 5 rows");

  // signed-out caller
  const anon = client();
  const r0 = await anon.rpc("delete_my_data");
  check(Boolean(r0.error), `signed-out caller refused (${r0.error?.code ?? "no error"} ${r0.error?.message ?? ""})`);

  // B deletes B
  const r1 = await B.rpc("delete_my_data");
  check(!r1.error && r1.data?.account === 1, `B deleted own account: ${JSON.stringify(r1.data)}${r1.error ? " · " + r1.error.message : ""}`);
  check(JSON.stringify(await countOwn(B)) === ZERO, "B: no rows left in any table");
  const gone = await B.auth.getUser();
  check(Boolean(gone.error) || !gone.data.user, "B: auth account no longer exists");
  check(JSON.stringify(await countOwn(A)) === ONE, "A: untouched after B's deletion");
  const r2 = await B.rpc("delete_my_data");
  check(Boolean(r2.error), `B calling again with the old token: refused (${r2.error?.message ?? "no error"})`);
  check(JSON.stringify(await countOwn(A)) === ONE, "A: still untouched");

  // A deletes A
  const r3 = await A.rpc("delete_my_data");
  check(!r3.error && r3.data?.account === 1, `A deleted own account: ${JSON.stringify(r3.data)}`);
  check(JSON.stringify(await countOwn(A)) === ZERO, "A: no rows left in any table");
} finally {
  // safety net: if a step failed midway, let any remaining test user delete itself (only ever deletes the caller)
  for (const sb of [A, B]) {
    const { data } = await sb.auth.getUser();
    if (data?.user) await sb.rpc("delete_my_data");
  }
}

console.log(fail ? `\n${fail} DELETE CHECK(S) FAILED` : "\nALL DELETE CHECKS PASSED (test users removed)");
process.exit(fail ? 1 : 0);

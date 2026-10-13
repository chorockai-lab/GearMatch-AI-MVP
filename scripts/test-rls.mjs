// RLS isolation test against the real Supabase project (reads .env.local; never prints keys).
// Creates two anonymous users A and B and proves B cannot read / change / impersonate A.
// Run: npm run test:rls
// Note: each run leaves 2 anonymous auth users (user_metadata.qa = "rls_test") and 1 event row ("rls_test") behind — events are append-only.
// Analytics queries exclude them (docs/ANALYTICS_QUERIES.md).
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
const denied = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0);

const anon = client();
const A = client();
const B = client();
const a = (await A.auth.signInAnonymously({ options: { data: { qa: "rls_test" } } })).data.user;
const b = (await B.auth.signInAnonymously({ options: { data: { qa: "rls_test" } } })).data.user;
check(Boolean(a?.id && b?.id && a.id !== b.id), "two anonymous users signed in");

// signed-out (anon role) has no access at all
for (const t of ["identity_results", "runner_profiles", "runs", "events"]) {
  const r = await anon.from(t).select("*").limit(1);
  check(Boolean(r.error), `signed-out cannot read ${t} (${r.error?.code ?? "no error!"})`);
}

// A writes its own data (user_id omitted → default auth.uid())
const idA = await A.from("identity_results").upsert({ animal_type_v2: "HAM", secondary_type_v2: "HOR", test_answers_v2: "AABAC", mixed_signal: false }).select().single();
check(!idA.error && idA.data?.user_id === a.id, `A upserts own identity ${idA.error?.message ?? ""}`);
const prA = await A.from("runner_profiles").upsert({ experience: "Y1_3", runs_per_week: "W3_4", typical_run_distance: "D5_10", current_shoe_status: "known", current_shoe_label: "Nike Pegasus 42" }).select().single();
check(!prA.error && prA.data?.user_id === a.id, `A upserts own profile ${prA.error?.message ?? ""}`);
const runA = await A.from("runs").insert({ run_date: "2026-10-13", distance_km: 5.2, duration_sec: 1810, shoe_label: "Nike Pegasus 42" }).select().single();
check(!runA.error && runA.data?.user_id === a.id, `A inserts own run ${runA.error?.message ?? ""}`);
const evA = await A.from("events").insert({ name: "rls_test", props: { ok: true } }).select().single();
check(!evA.error, `A inserts own event ${evA.error?.message ?? ""}`);
const runId = runA.data?.id;

// A reads back own rows
check(((await A.from("runs").select("id")).data ?? []).some((r) => r.id === runId), "A reads own run");

// B cannot see A's rows
check(denied(await B.from("runs").select("*").eq("id", runId)), "B cannot read A's run");
check(denied(await B.from("identity_results").select("*").eq("user_id", a.id)), "B cannot read A's identity");
check(denied(await B.from("runner_profiles").select("*").eq("user_id", a.id)), "B cannot read A's profile");
check(denied(await B.from("events").select("*").eq("user_id", a.id)), "B cannot read A's events");

// B cannot change or delete A's rows
check(denied(await B.from("runs").update({ distance_km: 99 }).eq("id", runId).select()), "B cannot update A's run");
check(denied(await B.from("runs").delete().eq("id", runId).select()), "B cannot delete A's run");
check(denied(await B.from("identity_results").update({ animal_type_v2: "CAT" }).eq("user_id", a.id).select()), "B cannot update A's identity");
const stillA = await A.from("runs").select("distance_km").eq("id", runId).single();
check(Number(stillA.data?.distance_km) === 5.2, "A's run unchanged after B's attempts");

// B cannot impersonate A
check(Boolean((await B.from("runs").insert({ user_id: a.id, run_date: "2026-10-13", distance_km: 1, duration_sec: 300 })).error), "B cannot insert a run as A");
check(Boolean((await B.from("identity_results").upsert({ user_id: a.id, animal_type_v2: "CAT", secondary_type_v2: "FOX", test_answers_v2: "EEEEE" })).error), "B cannot write A's identity");
check(Boolean((await B.from("events").insert({ user_id: a.id, name: "rls_test" })).error), "B cannot insert an event as A");

// events are append-only, constraints hold
check(denied(await A.from("events").update({ name: "changed" }).eq("id", evA.data?.id).select()), "events cannot be updated");
check(denied(await A.from("events").delete().eq("id", evA.data?.id).select()), "events cannot be deleted");
check(Boolean((await A.from("runs").insert({ run_date: "2026-10-13", distance_km: 0, duration_sec: 300 })).error), "distance 0 rejected by DB");
check(Boolean((await A.from("events").insert({ name: "Bad Name!" })).error), "invalid event name rejected by DB");

// cleanup A's own rows (events stay — append-only)
await A.from("runs").delete().eq("id", runId);
await A.from("runner_profiles").delete().eq("user_id", a.id);
await A.from("identity_results").delete().eq("user_id", a.id);
check(((await A.from("runs").select("id").eq("id", runId)).data ?? []).length === 0, "A deletes own run");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nALL RLS CHECKS PASSED");
process.exit(fail ? 1 : 0);

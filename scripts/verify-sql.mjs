// Runs the real migration and every query in docs/ANALYTICS_QUERIES.md on an embedded Postgres (PGlite),
// with a minimal stand-in for Supabase's auth schema. Checks: migration applies cleanly, RLS isolates rows,
// analytics queries run and the funnel numbers match hand-computed expectations. No network, no secrets.
// Run: npm run verify:sql
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let fail = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail++;
};

const db = new PGlite();

// ── Supabase stand-ins: auth.users, auth.uid(), roles ───────────────────────
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

const migration = readFileSync("supabase/migrations/20261013000000_init.sql", "utf8");
try {
  await db.exec(migration);
  check(true, "migration applies on a clean database");
  await db.exec(migration);
  check(true, "migration is re-runnable (if not exists / drop if exists)");
} catch (e) {
  check(false, `migration error: ${e.message}`);
}

// ── sample users ────────────────────────────────────────────────────────────
const U = {
  full: "00000000-0000-0000-0000-000000000001", // whole funnel in order
  quit: "00000000-0000-0000-0000-000000000002", // starts the test, leaves at Q2
  odd: "00000000-0000-0000-0000-000000000003", // test_complete recorded BEFORE test_start (out of order)
  old: "00000000-0000-0000-0000-000000000004", // visited 10 days ago only
  qa: "00000000-0000-0000-0000-000000000005", // QA browser (props.qa = true)
  rls: "00000000-0000-0000-0000-000000000006", // RLS test user (metadata)
};
for (const [k, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [id, k === "rls" ? { qa: "rls_test" } : {}]);
}

const ev = (user, name, minutesAgo, props = {}) =>
  db.query(`insert into public.events (user_id, name, props, created_at) values ($1, $2, $3, now() - ($4 || ' minutes')::interval)`, [user, name, props, String(minutesAgo)]);

// full: visit → start → q1..q5 → complete → reveal → onboarded → first run, then revisits tomorrow-ish
await ev(U.full, "app_open", 3000);
await ev(U.full, "landing_view", 3000);
await ev(U.full, "test_start", 2999);
for (let q = 1; q <= 5; q++) await ev(U.full, "test_question_view", 2999 - q, { q });
await ev(U.full, "test_complete", 2990);
await ev(U.full, "reveal_view", 2989);
await ev(U.full, "reveal_view", 2988); // viewed twice → count 2, unique 1
await ev(U.full, "onboarding_complete", 2980);
await ev(U.full, "run_save_success", 2970);
await ev(U.full, "app_open", 60); // another day
// quit
await ev(U.quit, "app_open", 500);
await ev(U.quit, "landing_view", 500);
await ev(U.quit, "test_start", 499);
await ev(U.quit, "test_question_view", 499, { q: 1 });
await ev(U.quit, "test_question_view", 498, { q: 2 });
// odd: complete before start → must not count as sequential completion
await ev(U.odd, "app_open", 400);
await ev(U.odd, "test_complete", 399);
await ev(U.odd, "test_start", 398);
// old: outside 7 days
await ev(U.old, "app_open", 60 * 24 * 10);
// excluded users
await ev(U.qa, "app_open", 100, { qa: true });
await ev(U.qa, "test_start", 99, { qa: true });
await ev(U.rls, "rls_test", 50);

// ── RLS sanity inside Postgres ──────────────────────────────────────────────
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${U.quit}', false);`);
const own = await db.query(`select count(*)::int as n from public.events`);
check(own.rows[0].n === 5, `RLS: user sees only own events (${own.rows[0].n} of 5)`);
let blocked = false;
try {
  await db.query(`insert into public.events (user_id, name) values ($1, 'x_test')`, [U.full]);
} catch {
  blocked = true;
}
check(blocked, "RLS: cannot insert an event for another user");
await db.exec(`reset role;`);

// ── analytics queries from the doc ──────────────────────────────────────────
const md = readFileSync("docs/ANALYTICS_QUERIES.md", "utf8").replace(/\r\n/g, "\n"); // Windows checkouts use CRLF
const blocks = [...md.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
const withBlock = blocks[0];
const queries = blocks.slice(1).map((b) => b.replace("-- (0의 with 블록)\n", withBlock.trimEnd() + "\n"));
check(queries.length === 11, `found ${queries.length} queries in docs/ANALYTICS_QUERIES.md`);

const results = [];
for (const [i, q] of queries.entries()) {
  try {
    results.push((await db.query(q)).rows);
    check(true, `query ${i + 1} runs`);
  } catch (e) {
    results.push(null);
    check(false, `query ${i + 1}: ${e.message}`);
  }
}

const [byName, visitors, steps, funnel, questions, , returning] = results;
const reveal = byName?.find((r) => r.name === "reveal_view");
check(reveal && Number(reveal.event_count) === 2 && Number(reveal.unique_users) === 1, "counts vs unique users kept apart (reveal_view 2 / 1)");
check(!byName?.some((r) => r.name === "rls_test"), "RLS test events excluded");
check(Number(visitors?.[0]?.visitors_7d) === 3, `visitors_7d = 3 (full, quit, odd; QA/old excluded) → ${visitors?.[0]?.visitors_7d}`);
const s = steps?.[0] ?? {};
check(Number(s.test_started) === 3 && Number(s.test_completed) === 2, `unordered steps: started 3, completed 2 → ${s.test_started}, ${s.test_completed}`);
const f = funnel?.[0] ?? {};
check(
  Number(f.s1_visit) === 3 && Number(f.s2_test_start) === 3 && Number(f.s3_test_complete) === 1 && Number(f.s6_first_run) === 1,
  `sequential funnel visit 3 → start 3 → complete 1 (out-of-order user dropped) → first run 1 → ${[f.s1_visit, f.s2_test_start, f.s3_test_complete, f.s6_first_run].join(", ")}`,
);
check(String(f.pct_start_to_complete) === "33.3", `start→complete 33.3% → ${f.pct_start_to_complete}`);
check(JSON.stringify(questions?.map((r) => [r.question, Number(r.users_reached)])) === JSON.stringify([[1, 2], [2, 2], [3, 1], [4, 1], [5, 1]]), "question drop-off 2,2,1,1,1");
check(Number(returning?.[0]?.returning_users) === 1, `returning users (app_open on 2+ days) = 1 → ${returning?.[0]?.returning_users}`);
const onb = results[8]?.[0] ?? {};
check(Number(onb.s1_reveal) === 1 && Number(onb.s2_habits) === 0, `onboarding steps: reveal 1 → habits 0 (sample has no profile events) → ${onb.s1_reveal}, ${onb.s2_habits}`);
const first = results[10]?.[0] ?? {};
check(Number(first.onboarded) === 1 && Number(first.saved_first_run) === 1, `first run: onboarded 1 → saved 1 → ${first.onboarded}, ${first.saved_first_run}`);

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nALL SQL CHECKS PASSED");
process.exit(fail ? 1 : 0);

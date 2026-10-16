// Privacy P-2 checks for public.delete_my_data() on an embedded Postgres (PGlite) — no network, no secrets, runs in CI.
//   • the function takes no arguments and runs as SECURITY DEFINER with search_path = ''
//   • anon cannot execute it, even though new public functions are executable by anon by default (Supabase-like default privileges)
//   • a signed-in anonymous user deletes only their own account + identity / profile / runs / saved shoes / events
//   • other users' rows are untouched; a non-anonymous account is refused; a caller without a JWT subject is refused
// Synthetic users only. Run: npm run verify:sql
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let fail = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail++;
};

const db = new PGlite();
// Supabase stand-ins: auth.users (with is_anonymous), a cascading auth.sessions table, auth.uid(), roles,
// and Supabase's default privilege that makes new public functions executable by anon / authenticated.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb, is_anonymous boolean not null default true);
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
const files = ["20261013000000_init.sql", "20261014000000_items.sql", "20261016000000_delete_my_data.sql"].map((f) =>
  readFileSync(`supabase/migrations/${f}`, "utf8"),
);
try {
  for (const sql of files) await db.exec(sql);
  await db.exec(files[2]);
  check(true, "init + items + delete_my_data migrations apply; delete_my_data migration re-runnable");
} catch (e) {
  check(false, `migration error: ${e.message}`);
  process.exit(1);
}

// ── function shape and privileges ───────────────────────────────────────────
const fn = (await db.query(`select pronargs, prosecdef, proconfig from pg_proc where proname = 'delete_my_data'`)).rows;
check(fn.length === 1 && fn[0].pronargs === 0, "exactly one delete_my_data(), with no parameters (a user id cannot be passed)");
check(fn[0]?.prosecdef === true && JSON.stringify(fn[0]?.proconfig) === JSON.stringify(['search_path=""']), "SECURITY DEFINER with search_path pinned to ''");
const priv = (await db.query(`select has_function_privilege('anon', 'public.delete_my_data()', 'execute') as anon,
                                     has_function_privilege('authenticated', 'public.delete_my_data()', 'execute') as auth`)).rows[0];
check(priv.anon === false && priv.auth === true, `EXECUTE: anon no, authenticated yes (anon=${priv.anon}, authenticated=${priv.auth})`);

// ── synthetic users and rows ────────────────────────────────────────────────
const U = { a: "00000000-0000-0000-0000-00000000000a", b: "00000000-0000-0000-0000-00000000000b", c: "00000000-0000-0000-0000-00000000000c" };
await db.query(`insert into public.products (id, brand, model_name, display_name) values ('TEST-SHOE', 'Test', 'Shoe', 'Test Shoe')`);
for (const [k, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, is_anonymous) values ($1, $2)`, [id, k !== "c"]); // c = non-anonymous account
  await db.query(`insert into auth.sessions (user_id) values ($1)`, [id]);
  await db.query(`insert into public.identity_results (user_id, animal_type_v2, secondary_type_v2, test_answers_v2) values ($1, 'WOL', 'HOR', 'ABCDE')`, [id]);
  await db.query(`insert into public.runner_profiles (user_id, height_cm, weight_kg, shoe_size_mm) values ($1, 175, 68, 270)`, [id]);
  for (const km of [5, 8]) await db.query(`insert into public.runs (user_id, run_date, distance_km, duration_sec) values ($1, current_date, $2, 1800)`, [id, km]);
  await db.query(`insert into public.saved_products (user_id, product_id) values ($1, 'TEST-SHOE')`, [id]);
  for (const n of ["app_open", "run_save_success"]) await db.query(`insert into public.events (user_id, name) values ($1, $2)`, [id, n]);
}
const TABLES = ["identity_results", "runner_profiles", "runs", "saved_products", "events"];
const counts = async (id) => {
  const out = {};
  for (const t of TABLES) out[t] = (await db.query(`select count(*)::int as n from public.${t} where user_id = $1`, [id])).rows[0].n;
  out.account = (await db.query(`select count(*)::int as n from auth.users where id = $1`, [id])).rows[0].n;
  out.sessions = (await db.query(`select count(*)::int as n from auth.sessions where user_id = $1`, [id])).rows[0].n;
  return out;
};
const FULL = JSON.stringify({ identity_results: 1, runner_profiles: 1, runs: 2, saved_products: 1, events: 2, account: 1, sessions: 1 });
const EMPTY = JSON.stringify({ identity_results: 0, runner_profiles: 0, runs: 0, saved_products: 0, events: 0, account: 0, sessions: 0 });

const as = async (role, sub, sql) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  try {
    return { rows: (await db.query(sql)).rows };
  } catch (e) {
    return { error: e };
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
};

// anon (signed out) cannot run it at all
const r1 = await as("anon", null, `select public.delete_my_data() as r`);
check(Boolean(r1.error) && /permission denied/i.test(r1.error.message), `anon: permission denied (${r1.error?.message ?? "no error"})`);
// authenticated role without a JWT subject is refused by the function
const r2 = await as("authenticated", null, `select public.delete_my_data() as r`);
check(Boolean(r2.error) && /not signed in/.test(r2.error.message), `authenticated without a user: refused (${r2.error?.message ?? "no error"})`);
// passing another user's id is impossible — the function has no parameter
const r3 = await as("authenticated", U.b, `select public.delete_my_data('${U.a}'::uuid) as r`);
check(Boolean(r3.error) && /does not exist/i.test(r3.error.message), `delete_my_data(<other id>) does not exist (${r3.error?.message ?? "no error"})`);
check(JSON.stringify(await counts(U.a)) === FULL && JSON.stringify(await counts(U.b)) === FULL, "nothing deleted by the refused calls");

// B deletes B
const r4 = await as("authenticated", U.b, `select public.delete_my_data() as r`);
const got = r4.rows?.[0]?.r ?? {};
check(!r4.error && got.account === 1 && got.runs === 2 && got.events === 2 && got.identity_results === 1 && got.runner_profiles === 1 && got.saved_products === 1,
  `B deletes own data: ${JSON.stringify(got)}${r4.error ? " · " + r4.error.message : ""}`);
check(JSON.stringify(await counts(U.b)) === EMPTY, "B: account, sessions, identity, profile, runs, saved shoes, events all gone");
check(JSON.stringify(await counts(U.a)) === FULL, "A: untouched");
check(JSON.stringify(await counts(U.c)) === FULL, "C: untouched");
// a second call with B's (now dangling) JWT deletes nothing
const r5 = await as("authenticated", U.b, `select public.delete_my_data() as r`);
check(Boolean(r5.error) && JSON.stringify(await counts(U.a)) === FULL, `B again after deletion: refused, A still intact (${r5.error?.message ?? "no error"})`);

// non-anonymous account is refused
const r6 = await as("authenticated", U.c, `select public.delete_my_data() as r`);
check(Boolean(r6.error) && /only an anonymous account/.test(r6.error.message) && JSON.stringify(await counts(U.c)) === FULL, "C (non-anonymous): refused, nothing deleted");

// products catalogue is shared data — never deleted
const prod = (await db.query(`select count(*)::int as n from public.products`)).rows[0].n;
check(prod === 1, "shared products catalogue untouched");

console.log(fail ? `\n${fail} DELETE SQL CHECK(S) FAILED` : "\nALL DELETE SQL CHECKS PASSED");
process.exit(fail ? 1 : 0);

// PostHog `all` (opt-out) E2E (docs/POSTHOG.md). Drives a real Chrome against a LOCAL build in server + all mode:
//   NEXT_PUBLIC_DATA_MODE=real NEXT_PUBLIC_POSTHOG_ENABLED=all npm run build && npm run start -- -p 3001
//   npm run e2e:all                (BASE=http://localhost:3001 by default; CHROME=path to override the browser)
// Checks the code path only — switching Production to `all` still needs the legal approval in docs/POSTHOG.md.
// Safety (scripts/e2e-harness.mjs): every PostHog request is intercepted and answered locally (nothing reaches PostHog). The
// test accounts are real anonymous Supabase accounts (shared DB) — every Supabase event row they write gets props.qa = true
// injected, so analytics exclude them, and each scenario ends with the app's own "내 데이터 삭제", which removes the account.
import { browser, check, failureCount, sleep } from "./e2e-harness.mjs";

const status = (b) => b.eval(`[...document.querySelectorAll('#analytics p')].map((p) => p.innerText).find((t) => t.startsWith('지금:')) ?? null`);
const buttons = (b) => b.eval(`[...document.querySelectorAll('#analytics button')].map((x) => x.innerText.trim())`);

// 1. 선택 없음 → 기본 전송 (opt-out); a regular browser's events carry no qa mark; deleting flags the PostHog person
{
  const b = await browser();
  await b.go("/");
  check(await b.eval(`document.querySelectorAll('input[type=checkbox]').length === 0 && document.body.innerText.includes('서비스 개선을 위해 이용 기록을 분석합니다.')`), "Landing: analytics notice, no consent checkboxes");
  await b.go("/test/1", 6000);
  const sent = b.events();
  check(sent.includes("app_open") && sent.includes("test_start"), `선택 없음: events go to PostHog by default (${[...new Set(sent)].join(",")})`);
  check(b.ph.filter((e) => e.event && !e.event.startsWith("$")).every((e) => e.qa === null), "선택 없음: regular events carry no qa mark (counted in the KPI dashboard)");
  check(!sent.includes("analytics_consent"), "선택 없음: no consent record sent to PostHog");
  await b.go("/privacy", 3500);
  check(JSON.stringify(await buttons(b)) === JSON.stringify(["보내지 않기"]) && (await status(b)) === "지금: 보내는 중", `개인정보 안내: one opt-out switch, status 보내는 중 (${JSON.stringify(await buttons(b))})`);
  check(await b.eval(`document.body.innerText.includes('‘보내지 않기’를 고르면 보내지 않습니다')`), "개인정보 안내: the PostHog items say how to refuse (보내지 않기)");
  const done = await b.deleteMyData();
  check(b.flags("deleted") === 1 && done === "데이터를 삭제했어요." && b.rpc.includes(200), `삭제: one PostHog deletion flag (deleted) + Supabase account deleted (${b.flags("deleted")})`);
  await b.close();
}

// 2. 보내지 않기 → 즉시 중단 + 삭제 요청 + Supabase 기록 → 다시 보내기
{
  const b = await browser();
  await b.go("/");
  await b.go("/test/1", 6000);
  check(b.events().length > 0, "거부 전: events sent");
  await b.go("/privacy", 3500);
  await b.click("보내지 않기");
  await sleep(2500);
  check(b.flags("withdrawn") === 1, `보내지 않기: PostHog person flagged for deletion (withdrawn) once (${b.flags("withdrawn")})`);
  const last = b.consentRows().at(-1);
  check(last?.stats === "denied" && last?.transfer === "denied" && last?.source === "privacy", `보내지 않기: refusal recorded in Supabase ${JSON.stringify(last ?? null)}`);
  check((await status(b)) === "지금: 보내지 않음", "보내지 않기: status shows 보내지 않음");
  const afterFlag = b.ph.length;
  await b.go("/");
  await b.go("/test/1", 5000);
  check(b.ph.length === afterFlag, `거부 후: nothing more sent to PostHog (${b.ph.length - afterFlag} new)`);
  await b.go("/privacy", 3500);
  await b.click("다시 보내기");
  await sleep(2000);
  check(b.consentRows().at(-1)?.stats === "granted" && b.consentRows().at(-1)?.transfer === "granted", "다시 보내기: recorded in Supabase");
  await b.go("/test/1", 6000);
  check(b.events().slice(-5).includes("test_start"), "다시 보내기: events go to PostHog again");
  const done = await b.deleteMyData();
  check(done === "데이터를 삭제했어요." && b.rpc.includes(200), "거부 시나리오 → 삭제: test account deleted");
  await b.close();
}

// 3. 기존 거부·철회 이력 보존 — a browser that withdrew under consent mode (any item denied, any notice version) stays out
{
  const b = await browser();
  await b.go("/privacy", 3000); // no product event on /privacy: nothing captured before the stored choice is in place
  await b.eval(`localStorage.setItem('gearmatch.analytics', JSON.stringify({ stats: 'granted', transfer: 'denied', version: '2026-10-21' })); true`);
  await b.go("/");
  await b.go("/test/1", 5000);
  const s = await b.local();
  check(b.ph.length === 0 && s.phStorage === 0, `consent 모드 철회 이력: nothing sent in all mode, no PostHog storage (requests ${b.ph.length})`);
  await b.eval(`localStorage.setItem('gearmatch.analytics', JSON.stringify({ stats: 'denied', transfer: 'denied', version: '2026-01-01' })); true`);
  await b.go("/test/1", 5000);
  check(b.ph.length === 0, `이전 안내 버전의 거부: still nothing sent (${b.ph.length})`);
  await b.go("/privacy", 3500);
  check((await status(b)) === "지금: 보내지 않음" && (await buttons(b)).includes("다시 보내기"), "개인정보 안내: shows 보내지 않음 with 다시 보내기");
  const done = await b.deleteMyData();
  check(done === "데이터를 삭제했어요." && b.ph.length === 0, `거부 이력 → 삭제: account deleted, no PostHog request (${b.ph.length})`);
  await b.close();
}

// 4. QA 세션 (?qa=1) — sent with qa = true (event + person), so the KPI dashboard (qa is not set) leaves it out
{
  const b = await browser();
  await b.go("/?qa=1");
  await b.go("/test/1", 6000);
  const product = b.ph.filter((e) => e.event && !e.event.startsWith("$"));
  check(product.length > 0 && product.every((e) => e.qa === true), `QA: every product event carries qa = true (${product.length})`);
  check(b.ph.some((e) => e.set?.qa === true), "QA: PostHog person marked qa = true");
  const done = await b.deleteMyData();
  check(done === "데이터를 삭제했어요." && b.rpc.includes(200), "QA → 삭제: test account deleted");
  await b.close();
}

console.log(failureCount() === 0 ? "\nALL `all`-MODE E2E CHECKS PASSED" : `\n${failureCount()} CHECK(S) FAILED`);
process.exit(failureCount() === 0 ? 0 : 1);

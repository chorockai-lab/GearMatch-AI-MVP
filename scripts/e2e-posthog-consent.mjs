// PostHog consent E2E (docs/POSTHOG.md). Drives a real Chrome against a LOCAL build in server + consent mode:
//   NEXT_PUBLIC_DATA_MODE=real NEXT_PUBLIC_POSTHOG_ENABLED=consent npm run build && npm run start -- -p 3001
//   npm run e2e:consent            (BASE=http://localhost:3001 by default; CHROME=path to override the browser)
// Safety (scripts/e2e-harness.mjs): every PostHog request is intercepted and answered locally (nothing reaches PostHog). The
// test accounts are real anonymous Supabase accounts (shared DB) — every Supabase event row they write gets props.qa = true
// injected, so analytics exclude them, and each scenario ends with the app's own "내 데이터 삭제", which removes the account.
import { browser, check, failureCount, sleep } from "./e2e-harness.mjs";

// 1. 동의 전 — nothing reaches PostHog, not even the SDK; deletion sends nothing either
{
  const b = await browser();
  await b.go("/");
  check(await b.eval(`document.querySelectorAll('input[type=checkbox]').length === 0 && document.body.innerText.includes('서비스 개선을 위해 이용 기록을 분석합니다.') && [...document.querySelectorAll('a')].some((a) => a.innerText.includes('자세히 보기') && a.getAttribute('href') === '/privacy')`), "Landing: no consent checkboxes; the analytics notice and the privacy link are shown");
  await b.go("/test/1");
  const s = await b.local();
  check(b.ph.length === 0 && s.phStorage === 0, `동의 전: no PostHog request and no PostHog storage (requests ${b.ph.length})`);
  check(b.sb.length > 0, `동의 전: Supabase events still recorded (${b.sb.length})`);
  const done = await b.deleteMyData();
  check(b.ph.length === 0 && done === "데이터를 삭제했어요." && b.rpc.includes(200), `동의 전 → 삭제: account deleted, still no PostHog request (${b.ph.length})`);
  await b.close();
}

// 2. 한 항목만 동의 — not enough; the choice is recorded in Supabase
{
  const b = await browser();
  await b.go("/");
  await b.grant(0); // 이용 통계 분석 only
  await sleep(1500);
  await b.go("/test/1");
  check(b.ph.length === 0, `한 항목만 동의: nothing sent to PostHog (${b.ph.length})`);
  const rows = b.consentRows();
  check(rows.length === 1 && rows[0].stats === "granted" && rows[0].transfer === null && rows[0].source === "privacy" && /^\d{4}-\d{2}-\d{2}$/.test(rows[0].version ?? ""), `한 항목만 동의: consent recorded in Supabase ${JSON.stringify(rows[0] ?? null)}`);
  await b.deleteMyData();
  check(b.ph.length === 0, "한 항목만 동의 → 삭제: no PostHog request");
  await b.close();
}

// 3. 두 항목 동의 → 철회 → 삭제
{
  const b = await browser();
  await b.go("/");
  await b.grant(0, 1);
  await sleep(1500);
  await b.go("/test/1", 6000);
  const sent = b.events();
  check(sent.includes("test_start") && !sent.includes("analytics_consent"), `두 항목 동의: events go to PostHog from consent on (${sent.join(",")}); the consent record stays Supabase-only`);
  check(b.consentRows().length === 2 && b.consentRows()[1].stats === "granted" && b.consentRows()[1].transfer === "granted", "두 항목 동의: both choices recorded in Supabase");
  await b.go("/privacy", 3500);
  check(await b.eval(`[...document.querySelectorAll('p')].some((p) => p.innerText === '지금: 보내는 중')`), "개인정보 안내: shows the consent status (보내는 중)");
  const beforeWithdraw = b.ph.length;
  await b.eval(`(() => { const rows = [...document.querySelectorAll('#analytics button')]; rows[1].click(); return true; })()`); // 국외 이전 → 동의 철회
  await sleep(2500);
  check(b.flags("withdrawn") === 1, `철회: PostHog person flagged for deletion (withdrawn) once (${b.flags("withdrawn")})`);
  check(b.consentRows().at(-1)?.transfer === "denied" && b.consentRows().at(-1)?.source === "privacy", "철회: withdrawal recorded in Supabase");
  const afterFlag = b.ph.length;
  await b.go("/test/1", 5000);
  check(b.ph.length === afterFlag, `철회 후: nothing more sent to PostHog (${b.ph.length - afterFlag} new)`);
  const done = await b.deleteMyData();
  check(done === "데이터를 삭제했어요." && b.ph.length === afterFlag, `철회 후 삭제: account deleted, no extra PostHog request (already flagged at withdrawal; ${b.ph.length - afterFlag} new)`);
  check((await b.local()).consent === null, "삭제: the PostHog consent is forgotten (the next account starts without consent)");
  void beforeWithdraw;
  await b.close();
}

// 4. 두 항목 동의 상태에서 바로 삭제 → one deletion flag, then the account is gone
{
  const b = await browser();
  await b.go("/");
  await b.grant(0, 1);
  await sleep(1500);
  await b.go("/test/1", 6000);
  check(b.events().length > 0, "동의 후: events sent");
  const done = await b.deleteMyData();
  check(b.flags("deleted") === 1 && done === "데이터를 삭제했어요." && b.rpc.includes(200), `동의 중 삭제: one PostHog deletion flag (deleted) + Supabase account deleted (${b.flags("deleted")})`);
  check(await b.eval(`document.body.innerText.includes('PostHog')`), "삭제 화면: says the PostHog copy is deleted separately");
  await b.close();
}

// 5. 동의 기록 저장 실패 → 재시도: PostHog waits until the consent record is stored in Supabase
{
  const b = await browser();
  b.failConsent = 2;
  await b.go("/");
  await b.grant(0, 1);
  await sleep(300);
  await b.go("/test/1", 1500); // reload while the record is still failing
  const early = b.events().length;
  check(b.failedConsent >= 1 && early === 0, `기록 저장 실패 중: nothing sent to PostHog (${early}) — failed record attempts ${b.failedConsent}`);
  await sleep(6000);
  const stored = b.consentRows();
  check(stored.length >= 2 && stored.at(-1).stats === "granted" && stored.at(-1).transfer === "granted", `재시도: both consent records stored in Supabase after the failures (${stored.length})`);
  check((await b.eval(`localStorage.getItem('gearmatch.events_pending')`)) === null, "재시도: nothing left in the browser queue");
  await b.go("/test/1", 6000);
  check(b.events().includes("test_start"), `기록 저장 후: events now go to PostHog (${b.events().join(",")})`);
  await b.deleteMyData();
  check(b.rpc.includes(200), "기록 실패 시나리오 → 삭제: test account deleted");
  await b.close();
}

console.log(failureCount() === 0 ? "\nALL CONSENT E2E CHECKS PASSED" : `\n${failureCount()} CHECK(S) FAILED`);
process.exit(failureCount() === 0 ? 0 : 1);

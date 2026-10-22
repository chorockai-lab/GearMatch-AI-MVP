// PostHog consent E2E (docs/POSTHOG.md). Drives a real Chrome against a LOCAL build in server + consent mode:
//   NEXT_PUBLIC_DATA_MODE=real NEXT_PUBLIC_POSTHOG_ENABLED=consent npm run build && npm run start -- -p 3001
//   npm run e2e:consent            (BASE=http://localhost:3001 by default; CHROME=path to override the browser)
// Safety: every PostHog request is intercepted and answered locally (nothing reaches PostHog). The test accounts are real
// anonymous Supabase accounts (shared DB) — every Supabase event row they write gets props.qa = true injected here, so
// analytics exclude them, and each scenario ends with the app's own "내 데이터 삭제", which removes the account and rows.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const BASE = process.env.BASE ?? "http://localhost:3001";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36"; // posthog-js ignores HeadlessChrome
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

async function browser() {
  const port = 9400 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "gm-e2e-"))}`, "--disable-gpu", "about:blank"], { stdio: "ignore" });
  let ws;
  for (let i = 0; i < 60 && !ws; i++) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
      ws = new WebSocket(t.webSocketDebuggerUrl);
    } catch {
      await sleep(250);
    }
  }
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const b = { ph: [], sb: [], rpc: [], send };
  const decode = (b64) => {
    const buf = Buffer.from(b64, "base64");
    let t;
    try {
      t = gunzipSync(buf).toString("utf8");
    } catch {
      t = buf.toString("utf8");
    }
    try {
      const j = JSON.parse(t);
      return (Array.isArray(j) ? j : (j.batch ?? [j])).map((e) => ({ event: e.event, set: e.properties?.$set ?? e.$set ?? null }));
    } catch {
      return [{ event: "?" }];
    }
  };
  ws.addEventListener("message", async (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
    if (m.method === "Fetch.requestPaused") {
      const r = m.params.request;
      if (/posthog\.com/.test(r.url)) {
        const body = r.postDataEntries?.length ? r.postDataEntries.map((x) => x.bytes ?? "").join("") : r.postData ? Buffer.from(r.postData, "latin1").toString("base64") : null;
        b.ph.push(...(body ? decode(body) : [{ event: `${r.method} (no body)` }]));
        await send("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from('{"status":1}').toString("base64") });
        return;
      }
      if (r.method === "POST" && /\/rest\/v1\/events/.test(r.url) && r.postData) {
        const j = JSON.parse(r.postData);
        const rows = Array.isArray(j) ? j : [j];
        for (const row of rows) {
          row.props = { ...(row.props ?? {}), qa: true };
          b.sb.push({ name: row.name, props: row.props });
        }
        await send("Fetch.continueRequest", { requestId: m.params.requestId, postData: Buffer.from(JSON.stringify(Array.isArray(j) ? rows : rows[0])).toString("base64") });
        return;
      }
      await send("Fetch.continueRequest", { requestId: m.params.requestId });
    }
    if (m.method === "Network.responseReceived" && /rpc\/delete_my_data/.test(m.params.response.url)) b.rpc.push(m.params.response.status);
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*posthog.com*" }, { urlPattern: "*/rest/v1/events*" }] });
  await send("Emulation.setUserAgentOverride", { userAgent: UA });
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  b.eval = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  b.go = async (path, ms = 4500) => {
    await send("Page.navigate", { url: BASE + path });
    await sleep(ms);
  };
  b.click = (text) => b.eval(`(() => { const el = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  b.check = (index) => b.eval(`(() => { const el = document.querySelectorAll('input[type=checkbox]')[${index}]; if (!el) return false; el.click(); return true; })()`);
  b.local = () => b.eval(`({ consent: localStorage.getItem('gearmatch.analytics'), sent: localStorage.getItem('gearmatch.analytics_sent'), phStorage: Object.keys(localStorage).filter((k) => k.startsWith('ph_')).length })`);
  b.events = () => b.ph.map((e) => e.event).filter((n) => n && !n.startsWith("$"));
  b.flags = (reason) => b.ph.filter((e) => e.set?.gm_deletion_requested && (!reason || e.set.gm_deletion_reason === reason)).length;
  b.consentRows = () => b.sb.filter((r) => r.name === "analytics_consent").map((r) => r.props);
  b.deleteMyData = async () => {
    await b.go("/privacy", 3500);
    await b.click("내 데이터 삭제하기");
    await sleep(700);
    await b.eval(`[...document.querySelector('[role=dialog]').querySelectorAll('button')].find((x) => !x.innerText.includes('취소')).click(); true`);
    await sleep(5000);
    return b.eval(`[...document.querySelectorAll('h2')].map((h) => h.innerText).find((t) => t.includes('삭제했어요') || t.includes('없어요')) ?? null`);
  };
  b.close = async () => {
    await Promise.race([send("Browser.close").catch(() => undefined), sleep(3000)]); // ends the whole Chrome (taskkill alone can leave it running)
    ws.close();
    await new Promise((r) => spawn("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { stdio: "ignore" }).on("exit", r).on("error", r));
    try {
      proc.kill();
    } catch {
      /* already gone */
    }
  };
  return b;
}

// 1. 동의 전 — nothing reaches PostHog, not even the SDK; deletion sends nothing either
{
  const b = await browser();
  await b.go("/");
  check(await b.eval(`document.querySelectorAll('input[type=checkbox]').length === 2 && [...document.querySelectorAll('input[type=checkbox]')].every((c) => !c.checked)`), "동의 전: Landing shows the two consent items, both unchecked");
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
  await b.check(0); // 이용 통계 분석 only
  await sleep(1500);
  await b.go("/test/1");
  check(b.ph.length === 0, `한 항목만 동의: nothing sent to PostHog (${b.ph.length})`);
  const rows = b.consentRows();
  check(rows.length === 1 && rows[0].stats === "granted" && rows[0].transfer === null && rows[0].source === "landing" && /^\d{4}-\d{2}-\d{2}$/.test(rows[0].version ?? ""), `한 항목만 동의: consent recorded in Supabase ${JSON.stringify(rows[0] ?? null)}`);
  await b.deleteMyData();
  check(b.ph.length === 0, "한 항목만 동의 → 삭제: no PostHog request");
  await b.close();
}

// 3. 두 항목 동의 → 철회 → 삭제
{
  const b = await browser();
  await b.go("/");
  await b.check(0);
  await b.check(1);
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
  await b.check(0);
  await b.check(1);
  await sleep(1500);
  await b.go("/test/1", 6000);
  check(b.events().length > 0, "동의 후: events sent");
  const done = await b.deleteMyData();
  check(b.flags("deleted") === 1 && done === "데이터를 삭제했어요." && b.rpc.includes(200), `동의 중 삭제: one PostHog deletion flag (deleted) + Supabase account deleted (${b.flags("deleted")})`);
  check(await b.eval(`document.body.innerText.includes('PostHog')`), "삭제 화면: says the PostHog copy is deleted separately");
  await b.close();
}

console.log(failures === 0 ? "\nALL CONSENT E2E CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

// Shared Chrome (CDP) harness for the PostHog E2E scripts (e2e-posthog-consent.mjs · e2e-posthog-all.mjs).
// Safety: every PostHog request is intercepted and answered locally (nothing reaches PostHog). Every Supabase event row a
// test browser writes gets props.qa = true injected, so analytics exclude it; scenarios end with the app's "내 데이터 삭제".
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

export const BASE = process.env.BASE ?? "http://localhost:3001";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36"; // posthog-js ignores HeadlessChrome
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
export const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};
export const failureCount = () => failures;

export async function browser() {
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
  const b = { ph: [], sb: [], rpc: [], send, failConsent: 0, failedConsent: 0 };
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
      return (Array.isArray(j) ? j : (j.batch ?? [j])).map((e) => ({ event: e.event, set: e.properties?.$set ?? e.$set ?? null, qa: e.properties?.qa ?? null }));
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
        if (b.failConsent > 0 && rows.some((row) => row.name === "analytics_consent")) {
          b.failConsent--; // simulate a network failure of the consent record
          b.failedConsent++;
          await send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "Failed" });
          return;
        }
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
  // consent is given on /privacy only (the Landing just informs since 2026-10-26): item 0 = 이용 통계 분석, 1 = 국외 이전
  b.grant = async (...items) => {
    await b.go("/privacy", 3500);
    for (const i of items) {
      await b.eval(`[...document.querySelectorAll('#analytics button')][${i}].click(); true`);
      await sleep(400);
    }
  };
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

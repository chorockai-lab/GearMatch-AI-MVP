// Creates (or completes) the "GearMatch MVP KPI" dashboard in PostHog via the private API.
// Needs a PostHog PERSONAL API key (phx_…) with scopes: dashboard:write, insight:write (read implied).
// The key is read from the environment and never printed. Safe to re-run: existing insights (same name) are kept.
//
//   PowerShell:  $env:POSTHOG_PERSONAL_API_KEY = "<paste>"; npm run posthog:dashboard; Remove-Item Env:POSTHOG_PERSONAL_API_KEY
//
// Every insight excludes internal QA events (event property `qa` is set only for ?qa=1 sessions).
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID ?? "662151";
const APP = process.env.POSTHOG_APP_HOST ?? "https://us.posthog.com"; // US Cloud private API (not the i. ingestion host)
const DASHBOARD = "GearMatch MVP KPI";

if (!KEY || !KEY.startsWith("phx_")) {
  console.log("Set POSTHOG_PERSONAL_API_KEY (a personal API key starting with phx_) in this terminal first.");
  process.exit(2);
}

const NOT_QA = [{ type: "event", key: "qa", operator: "is_not_set" }];
const ev = (event, extra = {}) => ({ kind: "EventsNode", event, name: event, ...extra });
const q = (n) => ev("test_question_view", { custom_name: `Q${n}`, properties: [{ type: "event", key: "q", operator: "exact", value: [n] }] });
const range30 = { date_from: "-30d" };
const funnel = (series, description) => ({
  description,
  query: {
    kind: "InsightVizNode",
    source: { kind: "FunnelsQuery", series, dateRange: range30, properties: NOT_QA, funnelsFilter: { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day", funnelOrderType: "ordered", funnelVizType: "steps" } },
  },
});

const INSIGHTS = [
  {
    name: "일간 방문 사용자",
    description: "app_open 고유 사용자/일 (QA 제외)",
    query: { kind: "InsightVizNode", source: { kind: "TrendsQuery", series: [ev("app_open", { math: "dau" })], interval: "day", dateRange: range30, properties: NOT_QA } },
  },
  { name: "동물 테스트 시작·완료", ...funnel([ev("app_open"), ev("test_start"), ev("test_complete")], "방문 → 테스트 시작 → 완료 (순서 반영, 14일 창)") },
  { name: "문항별 이탈", ...funnel([q(1), q(2), q(3), q(4), q(5), ev("test_complete")], "Q1~Q5 조회 → 완료. 답변 내용은 수집하지 않음") },
  { name: "Reveal → 온보딩 완료", ...funnel([ev("reveal_view"), ev("profile_habits_complete"), ev("onboarding_complete")], "결과 확인 → 러닝 습관 → 신발까지 완료") },
  { name: "첫 러닝 기록률", ...funnel([ev("onboarding_complete"), ev("run_save_success")], "온보딩 완료 후 러닝 기록 저장 성공") },
  { name: "ITEMS → 신발 상세 → 저장", ...funnel([ev("items_view"), ev("shoe_detail_view"), ev("shoe_save")], "ITEMS 진입 → 상세 → 저장") },
  {
    name: "재방문율 (주간)",
    description: "첫 방문 후 다시 app_open 한 사용자 비율 (QA 제외)",
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "RetentionQuery",
        dateRange: { date_from: "-56d" },
        properties: NOT_QA,
        retentionFilter: {
          retentionType: "retention_first_time",
          targetEntity: { id: "app_open", name: "app_open", type: "events" },
          returningEntity: { id: "app_open", name: "app_open", type: "events" },
          period: "Week",
          totalIntervals: 8,
        },
      },
    },
  },
];

async function api(method, path, body) {
  const res = await fetch(`${APP}/api/projects/${PROJECT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const existing = (await api("GET", `/dashboards/?limit=200`)).results.filter((d) => d.name === DASHBOARD && !d.deleted);
const dashboard = existing[0] ?? (await api("POST", "/dashboards/", { name: DASHBOARD, description: "GearMatch AI v2.0 MVP 핵심 지표. 모든 차트는 QA(?qa=1) 이벤트 제외. 실제 데이터가 쌓이기 전에는 비어 있음." }));
console.log(`${existing[0] ? "existing" : "created"} dashboard #${dashboard.id} "${DASHBOARD}"`);

const have = new Set(
  (await api("GET", `/insights/?limit=200&saved=true`)).results.filter((i) => !i.deleted && (i.dashboards ?? []).includes(dashboard.id)).map((i) => i.name),
);
let failed = 0;
for (const ins of INSIGHTS) {
  if (have.has(ins.name)) {
    console.log(`keep    ${ins.name}`);
    continue;
  }
  try {
    const created = await api("POST", "/insights/", { name: ins.name, description: ins.description, query: ins.query, dashboards: [dashboard.id], saved: true });
    console.log(`created ${ins.name} (#${created.short_id ?? created.id})`);
  } catch (e) {
    failed++;
    console.log(`FAILED  ${ins.name}: ${e.message}`);
  }
}
console.log(`\n${APP}/project/${PROJECT}/dashboard/${dashboard.id}`);
process.exit(failed ? 1 : 0);

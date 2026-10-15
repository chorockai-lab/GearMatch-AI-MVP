// PostHog dashboard definitions (no network, no key). Used by create-dashboard.mjs and check-dashboards.mjs.
// Event names are the existing ones from src/lib/events/track.ts — nothing new is collected for these charts.
//
//   GearMatch MVP KPI  — real users only: every insight has `qa is not set`
//   GearMatch QA Monitor — internal ?qa=1 sessions only: every insight has `qa is set`

const NOT_QA = [{ type: "event", key: "qa", operator: "is_not_set" }];
const ONLY_QA = [{ type: "event", key: "qa", operator: "is_set" }];

const ev = (event, extra = {}) => ({ kind: "EventsNode", event, name: event, ...extra });
const q = (n) => ev("test_question_view", { custom_name: `Q${n}`, properties: [{ type: "event", key: "q", operator: "exact", value: [n] }] });

const funnel = (series, description, properties, dateFrom = "-30d") => ({
  description,
  query: {
    kind: "InsightVizNode",
    source: {
      kind: "FunnelsQuery",
      series,
      dateRange: { date_from: dateFrom },
      properties,
      funnelsFilter: { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day", funnelOrderType: "ordered", funnelVizType: "steps" },
    },
  },
});

const KPI_INSIGHTS = [
  {
    name: "일간 방문 사용자",
    description: "app_open 고유 사용자/일 (QA 제외)",
    query: { kind: "InsightVizNode", source: { kind: "TrendsQuery", series: [ev("app_open", { math: "dau" })], interval: "day", dateRange: { date_from: "-30d" }, properties: NOT_QA } },
  },
  { name: "동물 테스트 시작·완료", ...funnel([ev("app_open"), ev("test_start"), ev("test_complete")], "방문 → 테스트 시작 → 완료 (순서 반영, 14일 창)", NOT_QA) },
  { name: "문항별 이탈", ...funnel([q(1), q(2), q(3), q(4), q(5), ev("test_complete")], "Q1~Q5 조회 → 완료. 답변 내용은 수집하지 않음", NOT_QA) },
  { name: "Reveal → 온보딩 완료", ...funnel([ev("reveal_view"), ev("profile_habits_complete"), ev("onboarding_complete")], "결과 확인 → 러닝 습관 → 신발까지 완료", NOT_QA) },
  { name: "첫 러닝 기록률", ...funnel([ev("onboarding_complete"), ev("run_save_success")], "온보딩 완료 후 러닝 기록 저장 성공", NOT_QA) },
  { name: "ITEMS → 신발 상세 → 저장", ...funnel([ev("items_view"), ev("shoe_detail_view"), ev("shoe_save")], "ITEMS 진입 → 상세 → 저장", NOT_QA) },
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

const QA_INSIGHTS = [
  {
    name: "QA 이벤트 (이벤트별, 7일)",
    description: "?qa=1 세션 이벤트 수를 이벤트 이름별로. Supabase events(props.qa = true)와 건수 비교용",
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "TrendsQuery",
        series: [{ kind: "EventsNode", event: null, name: "All events", math: "total" }],
        interval: "day",
        dateRange: { date_from: "-7d" },
        properties: ONLY_QA,
        breakdownFilter: { breakdown: "event", breakdown_type: "event_metadata", breakdown_limit: 30 },
        trendsFilter: { display: "ActionsTable" },
      },
    },
  },
  {
    name: "QA 사용자 수 (일별)",
    description: "?qa=1 세션 고유 사용자/일",
    query: {
      kind: "InsightVizNode",
      source: { kind: "TrendsQuery", series: [{ kind: "EventsNode", event: null, name: "All events", math: "dau" }], interval: "day", dateRange: { date_from: "-14d" }, properties: ONLY_QA },
    },
  },
  {
    name: "QA 온보딩 흐름",
    ...funnel(
      [ev("test_start"), ev("test_complete"), ev("reveal_view"), ev("onboarding_complete"), ev("running_view")],
      "테스트 시작 → 완료 → Reveal → 온보딩 완료 → RUNNING (QA 세션만)",
      ONLY_QA,
      "-7d",
    ),
  },
  {
    name: "QA 최근 이벤트",
    description: "최근 QA 이벤트 목록 — distinct_id(= Supabase 사용자 ID)·문항 번호·시간. 개인정보 속성은 수집하지 않음",
    query: {
      kind: "DataTableNode",
      source: {
        kind: "EventsQuery",
        select: ["event", "distinct_id", "properties.q", "properties.animal", "properties.qa", "timestamp"],
        orderBy: ["timestamp DESC"],
        after: "-7d",
        limit: 100,
        properties: ONLY_QA,
      },
    },
  },
];

export const DASHBOARDS = [
  {
    name: "GearMatch MVP KPI",
    description: "GearMatch AI v2.0 MVP 핵심 지표. 모든 차트는 QA(?qa=1) 이벤트 제외. 실제 사용자 데이터가 쌓이기 전(수집 모드 qa)에는 비어 있음.",
    insights: KPI_INSIGHTS,
  },
  {
    name: "GearMatch QA Monitor",
    description: "내부 검증용. QA(?qa=1) 세션 이벤트만 표시. KPI로 쓰지 않음.",
    insights: QA_INSIGHTS,
  },
];

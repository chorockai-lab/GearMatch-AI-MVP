# PostHog 연동

Supabase `events`(원본 기록)는 그대로 두고, **같은 제품 이벤트를 PostHog에도** 보냅니다(분석 화면용).

## 동작 방식

| 항목 | 내용 |
|---|---|
| 보내는 이벤트 | `src/lib/events/track.ts`의 22종 — Supabase에 한 줄 쓸 때 같은 호출에서 PostHog로 1건 (중복 없음) |
| 사용자 식별 | PostHog `distinct_id` = Supabase 익명 사용자 ID (`identify`) → 두 시스템에서 같은 사람 |
| 끈 기능 | Autocapture · 자동 Pageview/Pageleave · Session Replay · Heatmap · Dead click · Rage click · Web vitals · 예외 수집 · Surveys · Feature flags |
| 보내지 않는 것 | 키·체중·발 사이즈 값(입력 여부 true/false만), 테스트 답변 문구, 자유 입력, 사용자가 입력한 신발 이름, 주소의 `?쿼리`·`#조각`, 유입 경로(referrer) |
| 속성 제한 | 허용 목록(`src/lib/analytics/posthog-policy.ts` `ALLOWED_PROPS`)에 있는 코드·숫자·true/false만. 모르는 키·공백 있는 문자열은 버림 |
| SDK 로딩 | 보낼 수 있을 때만 `posthog-js`를 내려받음 (그 외 사용자는 다운로드 0) |
| 실패 시 | PostHog 설정이 없거나 연결이 실패해도 화면·Supabase 기록은 그대로 (검증함) |
| 저장 모드 | 서버 모드(`NEXT_PUBLIC_DATA_MODE=real`)에서만 동작 — 익명 사용자 ID가 필요하기 때문 |

## 환경변수 (값은 Git·대화에 올리지 않음)

| 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog Project API key (`phc_…`, 공개용) — **Personal API key(`phx_…`)를 넣지 말 것** |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_ENABLED` | `off`(기본·미설정) / `qa` / `all` |

- `qa`: 내부 QA 세션(아무 화면이나 `?qa=1`로 연 브라우저)만 PostHog로 보냄. **지금 단계 권장값**
- `all`: 모든 사용자. 개인정보 안내(및 필요 시 동의) 조치를 마친 뒤에만 사용. 브라우저에 `gearmatch.analytics=denied`가 있으면 보내지 않음(`setAnalyticsConsent("denied")` — 아직 화면 없음)
- `NEXT_PUBLIC_*`는 빌드 시 고정 → Vercel에서 값을 바꾸면 **Redeploy**

## 문제 해결

| 증상 | 원인 · 조치 |
|---|---|
| PostHog 요청은 200인데 Activity에 안 보임 | 토큰이 이 프로젝트의 Project API key가 아님 — 수집 서버는 틀린 토큰도 200으로 받음. Vercel 값이 `phc_`로 시작하는지 확인(2026-10-14 Preview에서 실제 발생: 33자·`phc_` 아님). 현재 코드는 `phc_` 형식이 아니면 PostHog를 켜지 않음 |
| 요청이 아예 없음 | `NEXT_PUBLIC_DATA_MODE=real`인지, `NEXT_PUBLIC_POSTHOG_ENABLED=qa`인지, `?qa=1`로 열었는지(localStorage `gearmatch.qa=1`), 광고 차단기 확인 |
| 값을 바꿨는데 그대로 | `NEXT_PUBLIC_*`는 빌드 시 고정 → Vercel Redeploy 필요 |

## QA 제외

- QA 세션 이벤트에는 `qa: true`가 붙고, 그 사용자는 PostHog Person 속성에도 `qa`가 등록됩니다.
- 대시보드의 모든 차트는 `qa is not set` 조건으로 QA 이벤트를 뺍니다.
- (선택) PostHog Project settings → **Filter out internal and test users**에 `qa` `is set`(event property)을 추가하면 다른 화면에서도 "Filter out internal and test users"로 제외할 수 있습니다.

## 대시보드 만들기 ("GearMatch MVP KPI")

PostHog → 좌측 아래 프로필 → **Personal API keys** → 새 키(Scopes: `dashboard:write`, `insight:write`)를 만든 뒤, **본인 터미널**에서:

```powershell
$env:POSTHOG_PERSONAL_API_KEY = "<붙여넣기>"
npm run posthog:dashboard
Remove-Item Env:POSTHOG_PERSONAL_API_KEY
```

키는 출력·저장되지 않습니다. 다시 실행해도 이미 있는 차트는 그대로 둡니다.

| 차트 | 정의 (최근 30일, QA 제외) |
|---|---|
| 일간 방문 사용자 | `app_open` 일별 고유 사용자 |
| 동물 테스트 시작·완료 | 퍼널 `app_open` → `test_start` → `test_complete` (순서, 14일 창) |
| 문항별 이탈 | 퍼널 `test_question_view` q=1…5 → `test_complete` |
| Reveal → 온보딩 완료 | 퍼널 `reveal_view` → `profile_habits_complete` → `onboarding_complete` |
| 첫 러닝 기록률 | 퍼널 `onboarding_complete` → `run_save_success` |
| ITEMS → 신발 상세 → 저장 | 퍼널 `items_view` → `shoe_detail_view` → `shoe_save` |
| 재방문율 (주간) | 리텐션 `app_open` → `app_open`, 주 단위 8주 |

실제 사용자 데이터가 들어오기 전에는 차트가 비어 있습니다(가상 수치 없음).
Supabase 쪽 같은 지표는 `docs/ANALYTICS_QUERIES.md`(원본 기준, 교차 확인용).

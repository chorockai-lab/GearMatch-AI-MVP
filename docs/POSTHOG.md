# PostHog 연동

Supabase `events`(원본 기록)는 그대로 두고, **같은 제품 이벤트를 PostHog에도** 보냅니다(분석 화면용).

## 동작 방식

| 항목 | 내용 |
|---|---|
| 보내는 이벤트 | `src/lib/events/track.ts`의 24종(2026-10-15 카드 이미지 2종 추가) — 25번째 `analytics_consent`(동의 기록)는 Supabase 전용 — Supabase에 한 줄 쓸 때 같은 호출에서 PostHog로 1건 (중복 없음) |
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
| `NEXT_PUBLIC_POSTHOG_ENABLED` | `off`(기본·미설정) / `qa` / `consent` / `all` |

- `qa`: 내부 QA 세션(`?qa=1`로 연 브라우저)만 PostHog로 보냄. **현재 Production 값**. 일반 사용자 이벤트가 PostHog에 없는 것이 정상
- `consent`(동의 방식, **채택 2026-10-21**): QA 세션 + **두 선택 동의(이용 통계 분석 · 미국 국외 이전)를 모두 한** 브라우저만. 동의는 랜딩 시작 버튼 아래 체크 2개 또는 `/privacy` **이용 통계 분석**에서. 선택 전·한 항목만·철회 후에는 아무것도 보내지 않음(SDK도 불러오지 않음). 동의 이전 이벤트는 소급 전송하지 않음 — 전체 퍼널은 Supabase 기준
- `all`(거부 방식): 모든 사용자, `/privacy`에서 `보내지 않기`를 고른 브라우저는 제외
- 랜딩 체크는 `consent`에서만, `/privacy` 선택 영역·PostHog 국외 이전 항목·삭제 화면의 PostHog 안내는 `consent`·`all`에서만 나타남(배포 모드에 맞춰 자동). `qa`(현재 Production)에서는 화면 변화 없음
- 선택은 브라우저 localStorage `gearmatch.analytics`(`{stats, transfer, version}`)에 두고, 안내 버전(`CONSENT_VERSION`, `posthog-policy.ts`)이 바뀌면 이전 동의는 무효 → 다시 동의해야 전송
- `consent`·`all`은 아래 **일반 사용자 전환** 선결 조건을 모두 마친 뒤에만 사용
- `NEXT_PUBLIC_*`는 빌드 시 고정 → Vercel에서 값을 바꾸면 **Redeploy**

## 문제 해결

| 증상 | 원인 · 조치 |
|---|---|
| PostHog 요청은 200인데 Activity에 안 보임 | 토큰이 이 프로젝트의 Project API key가 아님 — 수집 서버는 틀린 토큰도 200으로 받음. Vercel 값이 `phc_`로 시작하는지 확인(2026-10-14 Preview에서 실제 발생: 33자·`phc_` 아님). 현재 코드는 `phc_` 형식이 아니면 PostHog를 켜지 않음 |
| 요청이 아예 없음 | `NEXT_PUBLIC_DATA_MODE=real`인지, `NEXT_PUBLIC_POSTHOG_ENABLED` 값, `?qa=1`로 열었는지(localStorage `gearmatch.qa=1`), `consent`면 `/privacy`에서 동의했는지, 광고 차단기 확인 |
| 자동 점검(헤드리스 브라우저)에서만 요청이 없음 | posthog-js는 봇 브라우저(`HeadlessChrome` 등)의 이벤트를 보내지 않음 — 점검 시 휴대폰 User-Agent를 지정 |
| `?qa=0`이 안 먹음 | QA 표시는 이벤트를 보내는 화면에서만 갱신됨(`/privacy`는 이벤트 없음) — `/?qa=0`처럼 다른 화면에 붙임 |
| 값을 바꿨는데 그대로 | `NEXT_PUBLIC_*`는 빌드 시 고정 → Vercel Redeploy 필요 |

## QA 제외

- QA 세션 이벤트에는 `qa: true`가 붙고(브라우저에 저장되는 공통 속성), 그 사용자는 PostHog Person 속성에도 `qa: true`가 등록됩니다(2026-10-21부터).
- 대시보드의 모든 차트는 `qa is not set` 조건으로 QA 이벤트를 뺍니다.
- (선택) PostHog Project settings → **Filter out internal and test users**에 `qa` `is set`(event property)을 추가하면 다른 화면에서도 "Filter out internal and test users"로 제외할 수 있습니다.

## 대시보드 만들기 ("GearMatch MVP KPI" · "GearMatch QA Monitor")

정의: `scripts/posthog/dashboards.mjs` (기존 이벤트만 사용, 가상 수치 없음)

1. **호환성 확인 (키 불필요)**: `npm run posthog:check` — PostHog 공개 API 스키마에서 대시보드·인사이트 경로와 권한, 최신 쿼리 스키마로 11개 차트 정의를 검사합니다. 통과해야 2로 진행.
2. PostHog → 좌측 아래 프로필 → **Personal API keys** → 새 키(Scopes: `dashboard:write`, `insight:write`, 프로젝트 GearMatch만)
3. 키 넣기 — 셋 중 하나 (Git에 올라가지 않음)
   - **권장**: `powershell -NoProfile -ExecutionPolicy Bypass -File scriptsposthogun-dashboard.ps1` — 호환성 확인 후 가려진 입력칸에 키를 붙여넣음. 키는 그 실행 과정의 메모리에만 있고 끝나면 지움(화면·명령 기록·파일에 남지 않음). 형식이 틀리면 아무것도 보내지 않고 다시 물음
   - `.env.local`에 `POSTHOG_PERSONAL_API_KEY=phx_…` 한 줄 추가 → `npm run posthog:dashboard` (Claude가 대신 실행 가능, 키는 출력하지 않음)
   - 또는 본인 터미널에서:

```powershell
$env:POSTHOG_PERSONAL_API_KEY = "<붙여넣기>"
npm run posthog:dashboard
Remove-Item Env:POSTHOG_PERSONAL_API_KEY
```

4. 끝나면 키를 PostHog에서 삭제(또는 `.env.local`에서 줄 삭제)해도 됩니다. 대시보드는 남습니다.

키는 출력·저장되지 않습니다. 다시 실행해도 같은 이름의 대시보드·차트는 그대로 둡니다.
**현재 수집 모드가 `qa`라서 KPI 대시보드(QA 제외)는 실제 사용자 데이터가 없어 비어 있는 것이 정상**입니다. QA Monitor에는 `?qa=1` 세션만 보입니다.

생성 결과 (2026-10-15, 11개 모두 생성):
- GearMatch MVP KPI — https://us.posthog.com/project/662151/dashboard/2213495
- GearMatch QA Monitor — https://us.posthog.com/project/662151/dashboard/2213496

### GearMatch MVP KPI

| 차트 | 정의 (최근 30일, QA 제외) |
|---|---|
| 일간 방문 사용자 | `app_open` 일별 고유 사용자 |
| 동물 테스트 시작·완료 | 퍼널 `app_open` → `test_start` → `test_complete` (순서, 14일 창) |
| 문항별 이탈 | 퍼널 `test_question_view` q=1…5 → `test_complete` |
| Reveal → 온보딩 완료 | 퍼널 `reveal_view` → `profile_habits_complete` → `onboarding_complete` |
| 첫 러닝 기록률 | 퍼널 `onboarding_complete` → `run_save_success` |
| ITEMS → 신발 상세 → 저장 | 퍼널 `items_view` → `shoe_detail_view` → `shoe_save` |
| 재방문율 (주간) | 리텐션 `app_open` → `app_open`, 주 단위 8주 |

### GearMatch QA Monitor (내부 검증용 · `qa is set`)

| 차트 | 정의 |
|---|---|
| QA 이벤트 (이벤트별, 7일) | 모든 이벤트 수를 이벤트 이름별 표로 — Supabase `events`(props.qa = true)와 건수 비교 |
| QA 사용자 수 (일별) | QA 세션 고유 사용자/일 |
| QA 온보딩 흐름 | 퍼널 `test_start` → `test_complete` → `reveal_view` → `onboarding_complete` → `running_view` (7일) |
| QA 최근 이벤트 | 최근 100건: 이벤트·distinct_id(= Supabase 사용자 ID)·q·animal·시간 |

참고: 재방문 진입(2026-10-15)부터 `landing_view`는 Landing이 **실제로 보였을 때만** 기록됩니다(온보딩을 마친 사용자가 `/`로 와서 RUNNING으로 바로 이동하면 기록 안 함). `app_open`은 그대로 세션당 1회.

실제 사용자 데이터가 들어오기 전에는 차트가 비어 있습니다(가상 수치 없음).
Supabase 쪽 같은 지표는 `docs/ANALYTICS_QUERIES.md`(원본 기준, 교차 확인용).

## 일반 사용자 전환 (`consent`) — 2026-10-21 구현, 미적용

**왜 KPI 대시보드가 비어 있나**: Production이 `qa`라 일반 사용자 이벤트는 PostHog로 가지 않고, KPI 차트는 `qa is not set`으로 QA 이벤트를 뺍니다. Supabase에 쌓인 이벤트는 PostHog로 **소급되지 않습니다**. `consent` 전환 후에도 PostHog에는 **두 항목에 동의한 시점 이후**의 이벤트만 있습니다(동의자 표본 — 전체 전환율은 Supabase `docs/ANALYTICS_QUERIES.md` 기준).

### 동의 기록 (증빙)
- 동의·철회할 때마다 Supabase `events`에 `analytics_consent` 1행: `props = { stats, transfer: granted | denied | null, version, source: landing | privacy }` + 행의 `created_at`(시각)·`user_id`(익명 ID). **PostHog로는 보내지 않음**(`SUPABASE_ONLY_EVENTS`)
- 수정 가능성: 이용자는 자기 행을 **추가만** 가능(RLS: insert own, update·delete 정책 없음). 과거 기록을 고치거나 지울 수 없음. 운영자는 SQL Editor 권한으로 수정 가능 → 운영자 수정 금지를 운영 원칙으로 둠
- 삭제 시: '내 데이터 삭제'가 계정과 함께 이 기록도 삭제(이후 처리 근거 소멸 — PostHog 측 기록도 아래 절차로 삭제). 브라우저의 동의 선택도 지워져 새 계정은 다시 동의해야 함
- 조회(내부): `select created_at, props from public.events where name = 'analytics_consent' and user_id = '<ID>' order by created_at;` — ID는 개별 문의 대응 때만 사용, 저장소·문서에 남기지 않음

### 선결 조건 (모두 끝나야 Vercel 값 변경)
| # | 항목 | 담당 | 상태 |
|---|---|---|---|
| 1 | PostHog 이용 통계 처리(제15조 동의)와 미국 이전(제28조의8 ① 1호 별도 동의) 방식이 이 구현(체크 2개, 고지 내용은 '자세히' → `/privacy` 8번)으로 충분한지 | 법무 | 미확정 |
| 2 | 개인정보 안내(PR #37 + 이 PR) 게시 — 남은 `확정 전` 항목 해소 | 법무·사용자 승인 → 배포 | 미게시 |
| 3 | PostHog Settings → Project → **Discard client IP data** 켜기 | 운영(콘솔) | 미확인 |
| 4 | 위치 정보 제거: Data pipeline → GeoIP 변환 끄기 또는 Property filter로 `$geoip_*` 제거 | 운영(콘솔) | 미확인 |
| 5 | PostHog 요금제 확인(공식 문서: 무료 1년·유료 7년 보관, **줄일 수 없음**) | 운영(콘솔) | 미확인 |
| 6 | 삭제 요청 처리 결과 통지 등 **법정 기한** 확인(아래) | 법무 | 미확정 |

### 수집 최소화 (코드에서 이미 적용)
자동 수집(Autocapture·Pageview·Pageleave·Session Replay·Heatmap·Dead/Rage click·Web vitals·예외·Surveys·Feature flags) 꺼짐 · 속성 허용 목록 · 주소의 `?쿼리`·`#조각` 제거 · referrer를 Person 속성에 저장하지 않음. IP·위치는 위 3·4(콘솔 설정).

### PostHog 삭제 운영 절차
브라우저에서는 PostHog 데이터를 지울 수 없어 **운영자가 PostHog에서 삭제**합니다. PostHog Person ID = Supabase 익명 계정 ID.

**삭제 요청이 생기는 경우(자동)**: '내 데이터 삭제'(`gm_deletion_reason = deleted`) · 동의 철회(`withdrawn`). PostHog가 실제로 이 브라우저의 이벤트를 받은 적이 있을 때만 해당 Person에 `gm_deletion_requested = true`(`gm_deletion_requested_at` 날짜)를 보냄. 동의하지 않은 사용자는 PostHog 요청 자체가 없음. 광고 차단·네트워크 등으로 **누락될 수 있음** → 주 1회 대조로 보완.

| 주기 | 할 일 |
|---|---|
| **수시**(운영자가 확인할 때마다, 최소 업무일 1회 권장) | PostHog → Persons → 필터 `gm_deletion_requested` = true → 각 Person **Delete person (이벤트 포함)** · 이메일 요청은 접수 기록(본인 확인 방법은 개인정보 안내 U-6 결정 전까지 처리 보류) |
| **주 1회 누락 점검** | ① **삭제된 계정**: PostHog `select distinct distinct_id from events where timestamp > now() - interval 180 day` 목록 중 Supabase `auth.users`에 없는 ID → 삭제 ② **철회했는데 표시가 없는 계정**: Supabase에서 마지막 `analytics_consent`가 철회인 사용자 목록(아래 SQL) 중 PostHog에 Person이 남아 있는 ID → 삭제 ③ 처리 기록 작성 |

```sql
-- 주 1회 ②: 마지막 선택이 철회(어느 한 항목이라도 denied)인 사용자 ID (내부 대조용 — 결과를 저장소에 남기지 않음)
select user_id
from (
  select distinct on (user_id) user_id, props
  from public.events
  where name = 'analytics_consent'
  order by user_id, created_at desc
) last
where props->>'stats' = 'denied' or props->>'transfer' = 'denied';
```

**완료 확인**: 삭제한 각 ID에 대해 PostHog SQL `select count() from events where distinct_id = '<ID>'` = 0, Persons 검색 결과 없음. **처리 기록**(날짜 · 경로[요청 표시/대조/이메일] · 건수 · 확인 결과)만 내부 문서에 남기고 ID는 남기지 않음. 익명 서비스라 이용자에게 완료를 개별 통지할 수단은 없음.

**법정 기한**: 정정·삭제 요구의 처리·결과 통지 기한(개인정보 보호법 제36조, 시행령 제43조)과 동의 철회 시 파기 시점은 **법무 확인 필요**(2차 자료로는 시행령 제44조 처리정지 10일만 확인). 확인 전까지 내부 목표: 요청 표시 확인 즉시 처리, 늦어도 다음 주 점검 안에 완료.

### 보관 만료 (2027-02-04) 정리
PostHog 보관 기간(공식: 무료 1년)은 우리 보관 기한보다 길고 줄일 수 없으므로 직접 지웁니다.
1. 만료 전: Vercel `NEXT_PUBLIC_POSTHOG_ENABLED=off` → Redeploy(새 전송 중단)
2. 2027-02-04: PostHog 프로젝트의 모든 Person·이벤트 삭제 — Project settings → **Delete project**(프로젝트 전체) 또는 Persons 전체 삭제. 대시보드 정의는 `scripts/posthog/dashboards.mjs`로 다시 만들 수 있음
3. 확인: PostHog SQL `select count() from events` = 0(또는 프로젝트 없음) · Supabase 일괄 삭제(개인정보 안내 U-8)와 같은 날 처리 기록 작성

### 전환 순서 (승인 필요)
1. 선결 조건 완료 → PR #37·이 PR 병합 승인 → Production 배포(아직 `qa`라 화면·전송은 그대로, 안내문만 게시)
2. **승인 후** Vercel → Settings → Environment Variables → Production `NEXT_PUBLIC_POSTHOG_ENABLED` = `consent` → **Redeploy**
3. 검증: 실제 휴대폰 일반 브라우저(`?qa=1` 없이)로 랜딩에서 두 항목 동의 → 테스트 → PostHog Activity에 `qa` 없는 이벤트 도착 → KPI 대시보드 표시 → QA Monitor에는 안 보임 → 검증 브라우저는 '내 데이터 삭제' 후 PostHog Person도 위 절차로 삭제
4. 교차 검증(하루 뒤): 같은 기간 Supabase(QA 제외)와 PostHog(KPI) 이벤트별 사용자 수 비교 — PostHog ≤ Supabase가 정상(동의자만). PostHog가 많으면 오류. 동의율 = Supabase `analytics_consent`(두 항목 granted) 사용자 수 ÷ 방문 사용자 수

### 자동화 테스트
- `npm run test:analytics` — 모드별 전송 조건, 두 동의·안내 버전, 삭제 요청 조건(단위)
- `npm run e2e:consent` — 로컬 `consent` 빌드에서 동의 전 / 한 항목만 / 두 항목 / 철회 / 삭제 시나리오(18개 확인). PostHog 요청은 가로채 실제 전송 없음, Supabase 테스트 계정은 `qa` 표시 후 앱으로 삭제. 실행법은 파일 맨 위 주석

# PostHog 연동

Supabase `events`(원본 기록)는 그대로 두고, **같은 제품 이벤트를 PostHog에도** 보냅니다(분석 화면용).

## 동작 방식

| 항목 | 내용 |
|---|---|
| 보내는 이벤트 | `src/lib/events/track.ts`의 24종(2026-10-15 카드 이미지 2종 추가) — Supabase에 한 줄 쓸 때 같은 호출에서 PostHog로 1건 (중복 없음) |
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
- `consent`(동의 방식): QA 세션 + `/privacy`의 **이용 통계 분석**에서 `동의하기`를 누른 브라우저만. 선택 전·거부 후에는 아무것도 보내지 않음
- `all`(거부 방식): 모든 사용자, `/privacy`에서 `보내지 않기`를 고른 브라우저는 제외
- `consent`·`all`에서만 `/privacy`에 선택 영역과 PostHog 국외 이전 항목이 나타남(배포 모드에 맞춰 자동). 선택은 브라우저 localStorage `gearmatch.analytics`(`granted`/`denied`)
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

## 일반 사용자 전환 (`consent` 또는 `all`) — 2026-10-21 준비, 미적용

**왜 KPI 대시보드가 비어 있나**: Production이 `qa`라 일반 사용자 이벤트는 PostHog로 가지 않고(코드 의도대로), KPI 차트는 `qa is not set`으로 QA 이벤트를 뺍니다. 이미 Supabase에 쌓인 이벤트는 PostHog로 **소급되지 않습니다** — 전환 배포 이후의 신규 이벤트만 쌓입니다.

### 선결 조건 (모두 끝나야 Vercel 값 변경)
| # | 항목 | 담당 | 상태 |
|---|---|---|---|
| 1 | PostHog 이용 통계의 **처리 근거**(동의 / 그 밖의 근거)와 **미국 이전 근거**(제28조의8 제1항 제1호 별도 동의 / 제3호 처리방침 공개) | 법무 | 미확정 |
| 2 | 1의 결과로 모드 결정: 동의가 필요하면 `consent`, 아니면 `all` | 사용자 | 미확정 |
| 3 | 개인정보 안내(`/privacy`, PR #37 + 이 변경) 게시 — PostHog 위탁·국외 이전 항목, 거부 방법 포함 | 사용자 승인 → 배포 | 미게시 |
| 4 | PostHog 설정: Settings → Project → **Discard client IP data** 켜기 | 사용자(콘솔) | 미확인 |
| 5 | 위치 정보 제거: Data pipeline → GeoIP 변환 끄기 또는 Property filter로 `$geoip_*` 제거 (IP를 버려도 GeoIP는 저장 전에 IP를 읽을 수 있음) | 사용자(콘솔) | 미확인 |
| 6 | PostHog 데이터 보관 기간 확인 → 안내문에 기재 | 사용자(콘솔·요금제) | 미확인 |
| 7 | PostHog 삭제 처리 주기 결정(아래 절차) → 안내문에 기재 | 운영 | 미확정 |

### 처리 근거 문서화 (법무 결론 후 채움)
| 구분 | 근거 | 이용자 권리 행사 |
|---|---|---|
| `consent`로 결정 시 | 동의(선택) — 동의 전 전송 없음 | `/privacy` 이용 통계 분석에서 언제든 철회 → 즉시 중단, 철회해도 서비스 이용 가능 |
| `all`로 결정 시 | (법무가 정한 근거와 조문) | `/privacy`에서 `보내지 않기` → 즉시 중단 · 열람·삭제는 `chorock@chorock.co.kr` 또는 '내 데이터 삭제' |

### 수집 최소화 (코드에서 이미 적용)
자동 수집(Autocapture·Pageview·Pageleave·Session Replay·Heatmap·Dead/Rage click·Web vitals·예외·Surveys·Feature flags) 꺼짐 · 속성 허용 목록 · 주소의 `?쿼리`·`#조각` 제거 · referrer를 Person 속성에 저장하지 않음(`save_referrer: false`). IP·위치는 위 4·5(콘솔 설정)로 처리.

### '내 데이터 삭제'와 PostHog
- 브라우저에서는 PostHog 데이터를 직접 지울 수 없으므로, 삭제 직전에 그 사용자 Person에 `gm_deletion_requested = true`(날짜 `gm_deletion_requested_at`)를 표시하고 브라우저의 PostHog 식별값을 지웁니다(`flagPostHogDeletion`). 그 뒤 Supabase 삭제가 진행됩니다.
- PostHog로 보냈을 수 있는 브라우저에서만 실행(QA, `all`, `consent`에서 한 번이라도 선택한 브라우저). 거부 상태였어도 이 표시 1건만 보내고 다시 거부 상태로 돌아갑니다.
- **운영자 절차**: PostHog → Persons → 필터 `gm_deletion_requested` = true → 각 Person **Delete person (이벤트 포함)**. 주기는 7번에서 결정.

### 전환 순서 (승인 필요)
1. 선결 조건 1~7 완료 → 이 PR·PR #37 병합 승인 → Production 배포(아직 `qa`라 화면·전송은 그대로, 안내문만 게시)
2. **승인 후** Vercel → Settings → Environment Variables → Production `NEXT_PUBLIC_POSTHOG_ENABLED` = `consent` 또는 `all` → **Redeploy**
3. 검증: 새 일반 브라우저(실제 휴대폰, `?qa=1` 없이)로 랜딩 → 테스트 → (consent면 `/privacy`에서 동의 후) → PostHog Activity에 `qa` 없는 이벤트 도착 확인 → KPI 대시보드에 표시 확인 → QA Monitor에는 안 보이는지 확인 → 검증 브라우저는 '내 데이터 삭제'로 정리하고 PostHog Person도 위 절차로 삭제
4. 교차 검증(하루 뒤): 같은 기간 Supabase(QA 제외)와 PostHog(KPI) 이벤트별 사용자 수 비교 — PostHog가 적은 것은 정상(consent 미동의·거부·광고 차단기). PostHog가 Supabase보다 많으면 오류

```sql
-- Supabase: 전환 시각 이후 이벤트별 사용자 수 (QA 제외). 전환 시각을 넣어 실행
with qa_users as (
  select distinct user_id from public.events where props->>'qa' = 'true' or name = 'rls_test'
  union select id from auth.users where raw_user_meta_data ? 'qa'
)
select name, count(*) as events, count(distinct user_id) as users
from public.events e
where created_at >= timestamptz '2026-10-21 00:00+09' -- 전환 배포 시각으로 변경
  and not exists (select 1 from qa_users q where q.user_id = e.user_id)
group by name order by users desc;
```

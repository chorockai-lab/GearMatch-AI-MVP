# 외부 테스트 전 보안 점검 (Issue #14)

> 작성 2026-10-16 · 갱신 2026-10-19 (main `d768676`, 함수 4개 반영) · 코드·설정에서 직접 확인한 것과 대시보드에서 확인해야 할 것을 구분합니다.

## 1. 코드로 확인한 것 (정상)

| 항목 | 결과 | 근거 |
|---|---|---|
| 데이터 접근 권한(RLS) | 모든 사용자 테이블에 RLS 켜짐. 본인 행만 읽기·쓰기, 이벤트는 추가만 가능 | `supabase/migrations/20261013000000_init.sql` · `npm run test:rls` |
| 로그아웃 상태(anon 역할) | 테이블 권한 없음 | 같은 파일 `grant`는 `authenticated`에만 |
| ITEMS 비교 데이터 | 샘플 러너 원본은 읽기 불가(정책 없음), 집계 함수는 5명 미만이면 결과 없음, `search_path` 고정 | `20261014000000_items.sql` |
| 관리자 키 | 브라우저 코드에 없음 — 사용하는 환경 변수는 `NEXT_PUBLIC_*`(공개용 anon 키·URL)뿐 | `src/` 검색 |
| 이벤트 내용 | 답변 내용·키·체중·이메일은 이벤트에 넣지 않음, PostHog는 허용 목록 속성만 | `src/lib/events/track.ts`, `src/lib/analytics/posthog-policy.ts` |
| PostHog | `qa` 모드 — 내부 QA 브라우저만 전송. 자동 수집·세션 녹화·히트맵 꺼짐 | `src/lib/analytics/posthog.ts` |
| 개발용 화면 | `/dev/session`은 Production에서 404 | Production 확인(2026-10-16) |
| HTTPS | HSTS 적용(Vercel 기본) | 응답 헤더 |

## 2. 취약점 2건 (`npm audit --omit=dev`) — 영향 범위와 판단

| 패키지 | 등급 | 어디에 있나 | 실제 영향 | 외부 테스트 전 조치 |
|---|---|---|---|---|
| `postcss` 8.4.31 | High (XSS·임의 파일 읽기, 4건) | `next@15.5.27` 안에 포함된 사본 | Next가 **빌드할 때 우리 CSS 파일**을 처리하는 데만 씀. 공격하려면 공격자가 만든 CSS나 `sourceMappingURL`을 빌드에 넣어야 함 → 이용자 입력이 CSS 처리에 들어가는 경로가 없어 **운영 중 악용 불가** | **불필요** |
| `next` 15.5.27 | Moderate | 위 `postcss`를 포함한다는 이유로 표시 | 같은 이유 | **불필요** |

- 해결하려면 Next 16(메이저 업그레이드)이 필요 — 빌드·화면 전반 재검증이 필요해 **사용자 테스트 후** 진행 권장.
- 우리 쪽 CSS 도구(`@tailwindcss/postcss`)가 쓰는 `postcss`는 8.5.30으로 이미 패치된 버전.
- 개발 도구에만 있는 항목(전체 `npm audit`): `braces`(High, ESLint 경로), `ajv`(Moderate) — 배포 결과물에 포함되지 않음, 조치 불필요.

## 3. 대시보드에서 확인할 것 — 경로와 정상 기준 (2026-10-19 갱신)

> 코드·공식 문서로 확인할 수 있는 것은 아래 표의 "코드·문서로 확인한 사실"에 적었습니다. **콘솔 접근이 필요한 값만** 사용자가 확인합니다.
> 프로젝트: Supabase `ibutixxagfughyczelmk` (Preview·Production 공용) · Vercel `gear-match-ai-mvp`.

### 3-1. Supabase Security Advisor — 경고마다 실제 권한을 검토

경로: supabase.com → 프로젝트 → 왼쪽 **Advisors → Security Advisor** → `Rerun linter` → ERROR · WARN · INFO 목록 캡처.

**정상 기준: ERROR 0건.** WARN·INFO는 아래 표와 하나씩 대조하고, 표에 없는 항목은 **보고 후 판단**(자동으로 정상 처리하지 않음).

| 나올 수 있는 항목 (lint) | 등급 | 대상 | 실제 권한 (코드 확인) | 위험 판단 | 조치 |
|---|---|---|---|---|---|
| `0029` 로그인 사용자가 실행 가능한 SECURITY DEFINER 함수 | WARN | `delete_my_data()` | 매개변수 없음. `auth.uid()` 본인 행과 본인 `auth.users`만 삭제, 익명 계정이 아니면 거부. anon·public 실행 권한 회수. `search_path=''` | 익명 계정은 누구나 만들 수 있으므로 **"아무나 호출 가능"과 같음** → 그래도 자기 데이터만 지울 수 있음. 다른 사람 데이터 삭제 경로 없음(`npm run test:delete`·`verify:sql`) | 유지 |
| 〃 | WARN | `items_match()` | 호출자 본인 프로필만 읽고, 클라이언트가 직접 읽을 수 없는 샘플 러너를 집계해 반환. 실제 러너는 5명 이상일 때만 인원·비율, 가상(demo) 러너는 제품 목록만 | **현재 위험 낮음**: 운영 DB의 샘플 러너는 가상 300명뿐(실제 러너 0명). **잔여 위험**: 사용자는 자기 키·체중·발 사이즈를 바꿔 가며 반복 호출할 수 있음 → 나중에 실제 설문 러너를 넣으면 범위를 조금씩 옮겨 개별 러너의 신체 정보·신발을 추정할 수 있음 | 외부 테스트에는 유지. **실제 러너 데이터 추가 전**에 재검토(호출 빈도 제한·범위 고정 등) |
| 〃 | WARN | `runners_like_you(boolean)` | `items_match()`와 같은 구조, 가상 러너는 무시(실제 러너만) | 실제 러너 0명 → 지금은 항상 "부족" 응답. 추가 후 위와 같은 잔여 위험 | 위와 같음 |
| `0012` 익명 로그인 허용 | INFO | Auth 설정 | 익명 사용자 = `authenticated` 역할. 본인 행만 읽기·쓰기(RLS) | 의도된 구조. **실제 위험**: 누구나 계정을 만들어 이벤트(행당 2KB 이하)·러닝 기록을 쌓을 수 있음 → DB 용량·분석 오염. 다른 사람 데이터 접근은 불가 | 가입 Rate Limit(3-3) 확인 · 테스트 중 일일 신규 사용자 수 관찰(`ANALYTICS_QUERIES.md` §2) |
| `0027` GraphQL 스키마에 테이블 노출(로그인 사용자) | WARN | `pg_graphql`이 켜져 있으면 public 테이블 전체 | 앱은 GraphQL을 쓰지 않음(REST만). RLS가 GraphQL에도 그대로 적용 | 데이터 노출은 없음. 테이블·열 이름이 보이는 정도 | 외부 테스트에는 유지. 끄려면 운영 DB 변경 → 별도 승인 |
| `0008` RLS 켜짐·정책 없음 | INFO | `seed_runners`, `seed_runner_shoes` | 의도: 클라이언트가 샘플 러너를 직접 읽지 못하게 막음 | 정상(막혀 있다는 뜻) | 유지 |
| `0013` public 테이블 RLS 꺼짐 · `0007` 정책 있는데 RLS 꺼짐 | ERROR · INFO | — | 마이그레이션상 8개 테이블 모두 RLS 켜짐 | **나오면 오류** | 즉시 보고 |
| `0011` 함수 search_path 고정 안 됨 | WARN | — | 4개 함수(`set_updated_at`·`runners_like_you`·`items_match`·`delete_my_data`) 모두 `search_path=''` | **나오면 확인 필요**(대시보드에서 직접 만든 함수가 있는지) | 보고 |
| `0028` anon이 실행 가능한 SECURITY DEFINER 함수 | WARN | — | 3개 함수 모두 anon·public 권한 회수 | **나오면 오류**(회수가 반영되지 않은 것) | 즉시 보고 |
| 비밀번호 유출 방지·MFA 등 비밀번호 관련 | WARN | Auth | 비밀번호 로그인 미사용 | 해당 없음 | 유지 |

### 3-2. Anonymous Sign-ins

경로: **Authentication → Sign In / Providers** (또는 Providers 목록 상단) → `Allow anonymous sign-ins`.
**정상 기준: 켜짐.** 꺼지면 첫 방문자가 저장할 수 없어 서비스가 동작하지 않습니다(외부 공유 중단 사유).
같은 화면의 이메일·전화·소셜 로그인은 앱이 쓰지 않으므로 켜져 있을 필요가 없습니다(켜져 있으면 값을 보고만 해 주세요 — 변경은 별도 판단).

### 3-3. 가입 Rate Limit

경로: **Authentication → Rate Limits** → 익명 가입(anonymous sign-ins) 항목 (IP당 시간당 가입 수).
공식 문서 기본값: **시간당 30회/IP**.
**정상 기준: 30 이상.** 10~20명이 각자 휴대폰(서로 다른 IP)으로 참여하면 기본값으로 충분합니다. 같은 와이파이에서 여러 명이 한꺼번에 처음 접속하는 자리(설명회 등)가 있으면 그 시간만 올리는 것을 검토합니다.
너무 크게(수백 이상) 올라가 있으면 보고해 주세요 — 대량 가입 방어가 약해집니다.

### 3-4. Supabase 프로젝트 리전

경로: **Project Settings → General** (Region 표시) 또는 프로젝트 목록 카드.
**확인할 값**: 리전 이름(예: `Northeast Asia (Seoul)` = `ap-northeast-2`). 코드·환경 변수에는 리전이 드러나지 않아 콘솔 확인이 필요합니다.
리전이 서울이어도 국외 이전 여부는 Supabase(미국 회사)의 지원·운영 접근과 처리위탁 범위까지 법무 검토가 필요합니다(`docs/PRIVACY_NOTICE_DRAFT.md` L-4).

### 3-5. 로그·백업 보관 위치

| 대상 | 콘솔 확인 위치 | 공식 문서 기준 (요금제별) | 사용자가 확인할 값 |
|---|---|---|---|
| Supabase 요금제 | **Organization → Billing** | 보관 기간이 요금제로 정해짐 | 현재 요금제(Free/Pro/…) |
| Supabase 로그 (API·DB·Auth) | **Logs** (Logs Explorer) | API·DB 로그 Free **1일** · Pro **7일** · Team 28일 · Enterprise 90일 | 요금제로 결정 |
| Supabase 백업 | **Database → Backups** | Free **없음** · Pro **7일** · Team 14일 (일일 백업). PITR은 유료 추가 | 백업 목록이 있는지, 가장 오래된 날짜 |
| Supabase 인증 기록 (DB 안) | SQL Editor — 아래 읽기 전용 쿼리 | `auth.sessions`에 접속 IP·브라우저가 저장될 수 있음(계정 삭제 시 함께 삭제). `auth.audit_log_entries`는 계정 삭제와 별개로 남을 수 있음 | 쿼리 결과 |
| Vercel 요금제·로그 | **Team Settings → Billing** · 프로젝트 **Logs** | Runtime Logs Hobby **1시간** · Pro **1일** (Observability Plus 30일) | 요금제, Log Drain 설정 여부(**Settings → Log Drains**, 없어야 기본 보관만 적용) |
| Vercel Function Region | 프로젝트 **Settings → Functions → Function Regions** | 신규 프로젝트 기본값 **Washington, D.C., USA (`iad1`)**. 이 앱에서 서버 함수로 실행되는 화면은 신발 상세(`/items/[id]`) 하나, 나머지는 정적 화면(CDN) | 표시된 리전 |
| PostHog | 외부 참여자 데이터 미전송(`qa` 모드) | — | 확인 불필요(모드 유지만) |

공식 문서 출처(2026-10-19 확인): supabase.com/pricing · supabase.com/docs/guides/platform/backups · supabase.com/docs/guides/auth/rate-limits · vercel.com/docs/logs/runtime · vercel.com/docs/functions/configuring-functions/region

인증 기록 확인용 쿼리 (읽기 전용, 값이 아니라 **열 이름과 행 수**만 봅니다):

```sql
select table_name, string_agg(column_name, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'auth' and table_name in ('sessions', 'audit_log_entries')
  and column_name in ('ip', 'ip_address', 'user_agent', 'created_at', 'payload')
group by table_name;

select (select count(*) from auth.audit_log_entries) as audit_rows,
       (select min(created_at) from auth.audit_log_entries) as audit_oldest;
```

### 3-6. 확인 결과 기록
- 캡처와 값을 Issue #14 댓글로 남기면, 결과를 이 문서와 `docs/PRIVACY_NOTICE_DRAFT.md` §5에 반영합니다.

## 4. 외부 테스트 전 판단

| 구분 | 항목 |
|---|---|
| **반드시** | 개인정보 안내문 확정·게시(법적 검토 + 승인 후 `/privacy` 문구 교체 PR·배포) · Security Advisor ERROR 0 · 익명 로그인 켜짐 · Rate Limit 30 이상 |
| 권장(작음) | 보안 응답 헤더(`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) — `next.config.ts` 몇 줄, 화면 변화 없음. 승인 시 진행 |
| 실제 러너 데이터 추가 전 | `items_match()`·`runners_like_you()`의 반복 호출 추정 위험 재검토(§3-1) |
| 테스트 후 | Next 16 업그레이드(취약점 해소) · CAPTCHA · `pg_graphql` 비활성화 검토 · PostHog `all` 전환과 동의 화면 |

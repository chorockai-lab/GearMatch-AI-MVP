# 외부 테스트 전 보안 점검 (Issue #14)

> 작성 2026-10-16 · 기준 main `29882b6` · 코드·설정에서 직접 확인한 것과 대시보드에서 확인해야 할 것을 구분합니다.

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

## 3. 대시보드에서 확인할 것 — 절차 (사용자 또는 권한 위임)

### 3-1. Supabase Security Advisors
1. supabase.com → 프로젝트 `ibutixxagfughyczelmk` → 왼쪽 **Advisors** → **Security Advisor**
2. `Refresh`(또는 `Rerun linter`) 후 ERROR · WARN 목록을 캡처
3. 판단 기준
   - `RLS disabled in public` · `Policy exists RLS disabled` → **오류** (현재 마이그레이션 기준으로는 나오면 안 됨)
   - `Function search_path mutable` → `runners_like_you`는 고정돼 있어 해당 없음. 다른 함수가 나오면 보고
   - `Anonymous access policies`(익명 사용자에게 열린 정책) → **의도된 구조**(익명 로그인 서비스). 목록이 정책이 있는 6개 테이블(`identity_results`·`runner_profiles`·`runs`·`events`·`products`·`saved_products`)인지만 확인
   - `Leaked password protection` 등 비밀번호 관련 → 비밀번호 로그인을 안 쓰므로 해당 없음
   - (삭제 기능 적용 후) `delete_my_data` — "로그인 사용자가 실행 가능한 SECURITY DEFINER 함수" 경고 1건은 **의도된 예외**(매개변수 없음·호출자 본인만·anon 실행 불가, `docs/PRIVACY_DELETE.md` §2)
4. 같은 화면 **Performance Advisor**는 참고만

### 3-2. 익명 가입 제한
1. **Authentication → Sign In / Providers** → `Allow anonymous sign-ins`가 **켜짐**인지(꺼지면 서비스가 동작하지 않음)
2. **Authentication → Rate Limits** → `Anonymous sign-ins`(IP당 시간당 가입 수) 값 확인 — 기본 30/시간
   - 10~20명 테스트에는 기본값 유지 권장. 같은 와이파이에서 여러 명이 동시에 처음 접속하는 행사형 테스트라면 일시적으로 올리는 것을 검토(같은 IP로 묶임)
3. **Authentication → Attack Protection → CAPTCHA**는 켜지 않음 — 켜면 앱 코드 수정이 필요(현재 범위 밖). 대량 가입이 관찰되면 그때 결정
4. **Project Settings → General**에서 리전이 Seoul(`ap-northeast-2`)인지 확인 — 개인정보 안내문 5번에 사용

### 3-3. 확인 결과 기록
- 캡처와 값을 Issue #14 댓글로 남기면, 결과를 이 문서와 `DEVELOPMENT_STATUS.md`에 반영합니다.

## 4. 외부 테스트 전 판단

| 구분 | 항목 |
|---|---|
| **반드시** | 개인정보 안내문 확정·반영(`docs/PRIVACY_NOTICE_DRAFT.md`, 승인 후 `/privacy` 문구 교체) · Security Advisor에 ERROR 없음 확인 · 익명 로그인 켜짐 확인 |
| 권장(작음) | 보안 응답 헤더(다른 사이트 안에 넣어 보이기 차단 `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) — `next.config.ts` 몇 줄, 화면 변화 없음. 승인 시 진행 |
| 테스트 후 | Next 16 업그레이드(취약점 해소) · CAPTCHA · PostHog `all` 전환과 동의 화면 · 앱 내 데이터 삭제 기능 |

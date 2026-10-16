# 앱 안 개인정보 삭제 ("내 데이터 삭제") — 보안 설계 · 적용 절차

> 정책 P-2 (`docs/PRIVACY_NOTICE_DRAFT.md`). 브랜치 `feat/privacy-delete-my-data`, 2026-10-16.
> **완료** — 운영 Supabase 적용(2026-10-16, 사용자 실행) · PR #31 main 병합(`8c866bb`) · Production 검증 통과(§7).

## 1. 방식 비교

| 기준 | A. DB 함수 `public.delete_my_data()` (채택) | B. 서버 API + `auth.admin.deleteUser()` |
|---|---|---|
| 본인 확인 | DB가 요청의 로그인 토큰(JWT) 서명을 검증하고 `auth.uid()`로 호출자를 정함 | 서버가 `auth.getUser(token)`으로 Auth 서버에 토큰 확인 후 그 ID를 삭제 |
| 다른 사람 ID 전달 | **불가능** — 함수에 매개변수가 없음 | 요청 본문의 ID를 쓰지 않도록 코드로 지켜야 함 |
| 필요한 비밀 값 | **없음** (기존 공개 anon 키만) | `SUPABASE_SERVICE_ROLE_KEY`를 Vercel(Production·Preview)에 새로 등록 — 유출 시 DB 전체 권한 |
| 새로 열리는 경로 | 로그인 사용자만 실행 가능한 함수 1개(`/rest/v1/rpc/delete_my_data`) | 서버 API 1개 + 서버 측 최고 권한 키 |
| 공식성 | 커뮤니티에서 널리 쓰는 패턴. `auth.users` 직접 삭제 | Supabase 공식 사용자 삭제 API |
| Security Advisor | "로그인 사용자가 실행 가능한 SECURITY DEFINER 함수" **경고 1건 예상** — 의도된 예외로 기록 | 경고 없음 |
| 기존 구조와의 차이 | 지금처럼 브라우저 → Supabase 직접 호출 + DB 권한 규칙 | 처음으로 서버 API·서버 비밀 값이 생김 |
| 검증 | 임베디드 DB(CI) + 실제 DB(anon 키만)로 완전 검증 가능 | 실제 삭제 검증에 서비스 키를 로컬에도 둬야 함 |
| 구현량 | 마이그레이션 1개 + 호출 1줄 | API 라우트 + 환경 변수 2곳 + 호출 |

**추천: A.** GearMatch는 지금까지 서버 비밀 값 없이 "브라우저 → Supabase + RLS" 구조로만 동작합니다. A는 이 구조를 그대로 두고, 최고 권한 키를 배포 환경에 들이지 않으며(유출 위험 0), 함수 자체가 호출자 본인만 지울 수 있게 만들어져 있어 다른 사용자 삭제가 원천적으로 불가능합니다. B의 장점(공식 API, Advisor 경고 없음)보다 서비스 키를 새로 운영해야 하는 위험이 더 크다고 판단했습니다. 실제 DB 적용 후 `auth.users` 삭제 권한 문제가 생기면 B로 전환합니다(§5).

## 2. A의 보안 장치 (함수 `supabase/migrations/20261016000000_delete_my_data.sql`)

- **매개변수 없음** → `delete_my_data('<다른 ID>')` 호출 자체가 "함수 없음" 오류
- **호출자 = `auth.uid()`** (JWT의 `sub`). 로그인하지 않은 요청은 `not signed in`으로 거부
- **익명 계정만** (`auth.users.is_anonymous = true`) — 나중에 생길 수 있는 일반 계정은 거부
- **실행 권한**: `authenticated`만. Supabase는 `public` 스키마의 새 함수에 `anon` 실행 권한을 기본으로 주므로 `revoke ... from public, anon`을 명시
- **`SECURITY DEFINER` + `search_path = ''`** — `auth.users` 행 삭제에만 필요한 권한. 모든 이름을 스키마까지 적어 경로 조작 불가
- 삭제 범위(호출자 본인 행만): `identity_results`(테스트 답·결과) · `runner_profiles`(습관·신체 정보·현재 신발) · `runs` · `saved_products`(관심 신발) · `events`(이용 기록) · `auth.users`(익명 계정 — 세션·리프레시 토큰은 Auth 스키마 안에서 연쇄 삭제). 기존 외래 키의 `on delete cascade`도 같은 행을 지움
- 지우지 않는 것: 공용 상품 목록 `products`, 샘플 러너, 다른 사용자의 모든 행
- 반환값: 표별 삭제 건수(화면에는 표시하지 않음)

## 3. 앱 쪽 동작

- `/privacy` 아래에 `내 데이터 삭제` 섹션 → `내 데이터 삭제하기` → 확인 시트("모든 데이터를 삭제할까요? … 되돌릴 수 없어요", `취소` / `삭제`)
- 삭제 성공 → 이 브라우저 로그아웃(세션 제거) → 앱 데이터 키(`gearmatch.*`) 정리 → "데이터를 삭제했어요." → `처음 화면으로`(전체 새로고침). QA 표시(`gearmatch.qa`)와 분석 선택(`gearmatch.analytics`)은 개인정보가 아니라 유지
- 세션이 없는 브라우저 → 새 익명 계정을 만들지 않고 "삭제할 데이터가 없어요."
- 실패 → 시트 안에 "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." (아무것도 지우지 않음)
- 브라우저 저장소만 지우는 방식이 아님 — 서버 삭제가 성공한 뒤에만 로컬을 정리
- 분석 이벤트는 추가하지 않음(이벤트 구조 변경 없음). PostHog 설정 변경 없음
- 화면 진입: 기존 링크(프로필 2단계 "개인정보 수집·이용 안내") 또는 주소 `/privacy` 직접 입력. 다른 화면에 링크를 새로 넣지 않음(UI 변경 없음)

## 4. 운영 DB 적용 절차 (승인 후)

1. Supabase 대시보드 → **SQL Editor** → `supabase/migrations/20261016000000_delete_my_data.sql` 전체를 붙여넣고 실행 (저장 쿼리명 예: `P2_Delete_My_Data`)
   - 함수 1개를 추가할 뿐 기존 행을 읽거나 바꾸지 않습니다. 다시 실행해도 같은 결과(`create or replace`)
2. 적용 확인(읽기 전용):
   ```sql
   select proname, pronargs, prosecdef, proconfig,
          has_function_privilege('anon', 'public.delete_my_data()', 'execute')          as anon_can_execute,
          has_function_privilege('authenticated', 'public.delete_my_data()', 'execute') as authenticated_can_execute
   from pg_proc where proname = 'delete_my_data';
   ```
   기대: `pronargs 0 · prosecdef true · {search_path=""} · anon false · authenticated true`
3. 로컬에서 `npm run test:delete` — 일회용 익명 사용자 2명만 만들고 스스로 삭제(기존 사용자 영향 없음)
4. Preview(`?qa=1`)에서 새 QA 계정으로 온보딩 → 기록 1건 → `/privacy` → 삭제 → 처음 화면 확인
5. `docs/SUPABASE.md` 적용 이력에 한 줄 추가

## 5. 남은 위험 · 한계

| 위험 | 내용 | 대응 |
|---|---|---|
| `auth.users` 삭제 권한 | Supabase가 `auth` 스키마 권한 정책을 바꾸면 SQL Editor로 만든 함수의 소유자가 `auth.users`를 못 지울 수 있음 | 적용 후 `test:delete`로 실제 확인. 실패하면 B(공식 API)로 전환 — 이 경우 서비스 키 등록이 필요해 다시 승인 요청 |
| 발급된 토큰 | 삭제 후에도 그 브라우저가 가진 접근 토큰은 만료(최대 1시간)까지 형식상 유효(B도 같음) | 데이터·계정이 없어 읽을 것이 없고, 앱은 즉시 로그아웃. 남은 토큰으로 새 행을 만들면 계정이 없어 거부됨(외래 키) |
| Advisor 경고 | `delete_my_data`에 대한 SECURITY DEFINER 경고 1건 | 이 문서의 §2를 근거로 의도된 예외로 기록 |
| 다른 브라우저 데이터 | 한 사람이 여러 브라우저를 썼다면 각각 그 브라우저에서 삭제해야 함 | 안내문 4번에 명시 |
| 제공업체 로그·백업 | Supabase 백업, Vercel 접속 로그, PostHog(QA 데이터)는 이 기능으로 지워지지 않음 | 안내문에 보관 정책 별도 표기([확인 필요]) |
| 오삭제 | 되돌릴 수 없음 | 확인 시트 + 호출자 본인만 삭제 가능 + 자동 테스트 |

## 6. 실제 DB 검증 결과 (2026-10-16)

| 항목 | 결과 |
|---|---|
| 적용 | 사용자가 SQL Editor에서 실행 — `Success. No rows returned`, 권한 확인 SQL 정상 |
| 로그인 없는 호출 | 거부 (401 · `42501 permission denied for function delete_my_data`) |
| `npm run test:delete` | 15개 통과 — 일회용 익명 사용자 A·B: B 삭제 후 B의 5개 표 0건·계정 없음, A 그대로, B의 옛 토큰 재호출 거부, A 삭제. 테스트 사용자 잔여 없음 → 운영 DB의 `auth.users` 삭제 권한 정상(방식 B 전환 불필요) |
| Preview UI (`?qa=1`) | 새 QA 계정(`089c4d53…`)으로 온보딩(신체 정보 포함) → 기록 1건 → `/privacy` 삭제 → "데이터를 삭제했어요." · 로그인 세션·`gearmatch.*` 제거(QA 표시 유지) → `처음 화면으로` 시 랜딩 + 새 익명 사용자(`8c21b115…`) |
| 다른 계정 보호 | 기존 Production QA 계정(고양이 · 기록 5.2km · 신발) 삭제 전후 모두 그대로 |
| 남은 확인 | Preview UI 삭제 계정의 서버 행 0건은 화면 새로고침으로 옛 토큰을 잃어 직접 재확인하지 못함 — 같은 함수의 서버 확인은 `test:delete`로 완료. 필요하면 SQL Editor에서 `select count(*) from auth.users where id::text like '089c4d53%';` (0 기대) |

## 7. Production 검증 (2026-10-16, main `8c866bb`)

| 항목 | 결과 |
|---|---|
| 배포 | Vercel Production 성공(병합 후 약 70초), main CI 통과 |
| `/privacy` | `내 데이터 삭제` 섹션 표시. 안내 문구는 여전히 "아직 확정되지 않았어요"(미확정 유지) |
| 신규 QA 계정 삭제 | 새 헤드리스 브라우저 프로필에서 만든 QA 계정(`3cf2d0fe…`): 온보딩 → 기록 1건(4.8km) → 삭제 전 본인 행 결과 1·프로필 1·기록 1·이벤트 28 → 확인 시트 → "데이터를 삭제했어요." → 삭제 후 5개 표 모두 0, 계정 조회 403, 로컬에는 `gearmatch.qa`만 남음 |
| 신규 진입 | `처음 화면으로` → 랜딩, 새 익명 사용자(`1a43319b…`, QA) |
| 기존 QA 계정 | Production QA 계정(고양이 · 5.2km · 신발) 그대로 |
| 콘솔 오류 | 0 |
| 참고 | 검증 스크립트 오류로 첫 실행이 테스트 중간에 멈췄으나, 같은 브라우저 프로필로 이어서 실행해 같은 QA 계정을 끝까지 진행·삭제함(남은 계정 없음). 검증 중 남은 QA 계정은 재진입 확인용 `8c21b115…`(Preview)·`1a43319b…`(Production) 2개 — 랜딩 방문 기록만 있음 |

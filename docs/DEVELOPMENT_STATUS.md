# 개발 현황

> 최종 갱신: 2026-10-13 · 기준: 실제로 실행해 확인한 결과만 "완료"로 적습니다.

## STEP 진행

| STEP | 내용 | 상태 |
|---|---|---|
| 1 | Foundation — Next.js · RUNNING Main · 픽셀 에셋 · 판정 로직 | 완료 (main) |
| 2 | Onboarding — Landing → Test → Reveal → Profile 1/2 → Shoe → RUNNING | 완료 (main, PR #6) |
| 3 | Running & Stats — Supabase · Run CRUD · History · Stats · 이벤트 | 완료 (main, PR #7) |
| 4 | ITEMS — 유사 러너 집계 · Product Detail · Saved | 구현 + **실제 Supabase 검증 완료** → PR #8 · CI 후 main 반영 |
| 5 | QA & Deployment — 전체 QA · Vercel 내부 배포 | 미착수 |

## STEP 4에서 구현·검증한 것

| 기능 | 위치 | 검증 |
|---|---|---|
| DB | `supabase/migrations/20261014000000_items.sql` — products · seed_runners · seed_runner_shoes · saved_products · `runners_like_you()` | PGlite: 적용·재실행 안전, 샘플 러너 원본 조회 차단, 비활성 상품 숨김, 저장 목록 본인만, 로그아웃 호출 차단 |
| 집계 | 서버 `runners_like_you()` = 로컬 `src/lib/items/aggregate.ts` | 같은 데이터에서 288/288 결과 일치. 단위 테스트 23건(`npm run test:items`) |
| 가져오기 | `npm run items:import` (Excel/CSV 검증 → SQL·로컬 JSON) | Product DB v0.3_수정본: 63개(표시 50, 숨김 13), 승인 이미지 0 → 대체 실루엣. 실제 ID 형식(밑줄) 대응 |
| 로컬 DEMO | `npm run items:demo` + `NEXT_PUBLIC_ITEMS_DEMO=1` (demo 저장 모드 전용) | 가상 러너 40명, 실제 product_id 연결, 서버 SQL 생성 거부, Git 제외 |
| ITEMS Main | `/items` | 정상(28명·목록) / A 부족(4명) → 사용자 선택 시 B 확대(28명) → 원래 조건 / C 확대 후 부족 / 정보 부족 → 내 정보 추가 → ITEMS 복귀 |
| Product Detail | `/items/[id]` | 비율·N명 중 X명·기록 합계(DEMO DATA 표시)·공식 링크, 저장 후 같은 화면 유지 |
| Saved | `/items/saved` | 목록 → 상세 → 뒤로가기 시 Saved 복귀, 저장 취소, 빈 상태 |
| DEMO 끔 | 기본 빌드 | 0명·목록 없음·DEMO 표시 없음 (가짜 수치 없음) |
| 이벤트 | `shoe_detail_view` · `shoe_save` · `shoe_unsave` 추가(총 22종) | 서버 모드 QA 세션에서 기록 확인, 저장 실패 시 `shoe_save` 미기록 |
| 320px | ITEMS 화면 5개 | 가로 넘침 0건 |

### STEP 4 실제 Supabase 검증 (2026-10-13, 서버 모드 배포용 빌드 · QA 세션)

| 항목 | 결과 |
|---|---|
| SQL 적용 | 사용자가 SQL Editor로 `STEP4_Items_Database_Setup`, `STEP4_Product_Data_Seed_v0.3` 실행 (재실행 안 함) |
| `check:supabase` | products 13열 · saved_products 3열 · `runners_like_you()` 실행 · seed 테이블 조회 차단 · 앱에 보이는 상품 50개 |
| 전체 63개 · 샘플 러너 0명 | RLS로 앱에서 셀 수 없음 → 대시보드 확인 SQL(`docs/SUPABASE.md`)로 확인. 로컬 Postgres에 같은 SQL 적용 시 63/50/0/0 |
| `test:rls` | 전부 통과 — A/B 저장 목록 격리(조회·삭제·사칭 차단), 샘플 러너 조회 차단, 로그아웃 집계 호출 차단 |
| ITEMS 화면 | 프로필 173/70/270 → A(0명) → 사용자 선택 확대 → C(0명), 가짜 수치·DEMO 표시 없음 |
| 상품 상세 | 대체 실루엣 · "아직 비교할 비슷한 러너가 충분하지 않아요" · 태그 · 공식 링크(숫자 없음) |
| 저장 / 취소 | 저장 → 새로고침 후에도 "저장됨"(서버 재조회) → Saved 목록 → 상세 → 뒤로가기 Saved → 저장 취소 → 빈 상태, DB 0행 |
| 저장 실패 | 요청 실패 시 "저장하지 못했어요" · 저장 상태 원복 · 이벤트 미기록 → 재시도 성공 |
| 이벤트 | items_view(base/wide) · shoe_detail_view · shoe_save · shoe_unsave 기록, 전부 `qa: true` |

실제 샘플 러너가 들어오기 전까지 서버 모드 ITEMS는 "부족" 상태가 정상이며, 목록이 없으므로 상품 상세는 Saved로만 들어갈 수 있습니다(현재 Saved도 비어 있으면 진입 경로 없음).

## STEP 3에서 구현·검증한 것

| 기능 | 경로 / 위치 | 실제 Supabase(서버 모드) 검증 |
|---|---|---|
| DB 스키마 + RLS | `supabase/migrations/20261013000000_init.sql` (SQL Editor로 적용) | 4개 테이블·37개 열·`updated_at` 트리거 확인, RLS 26건 통과 |
| 익명 사용자 | `src/lib/supabase/client.ts` `ensureUserId()` | 첫 화면에서 익명 세션 생성, 동시 호출 시 사용자 1명만 생성 |
| 온보딩 서버 저장 | `src/lib/onboarding/server-repository.ts` | `identity_results`(HOR/HAM/BABCC), `runner_profiles`(습관·신체·신발·완료 시각) 저장 → 로컬 데이터 지우고 새로고침해도 서버에서 동일 값 |
| DEMO/서버 데이터 분리 | 로컬 키 분리 (`gearmatch.onboarding.v1` vs `...server-draft.v1`) | 서버 모드에서 DEMO 키 미사용 확인. DEMO 기록은 서버로 옮기지 않음 |
| 러닝 기록 입력 | `/runs/new` | 저장 → `runs` 행 생성. 오류 문구·AUTO 페이스·미래 날짜 거부·신발 미지정 |
| 저장 실패 | add-run-failed | 요청 실패 시 화면 유지·배너·입력값 유지·"다시 시도하기", DB 행 없음, RUN 전환 없음 → 재시도 성공 후 RUN |
| History / Detail | `/runs`, `/runs/[id]` | 월별 묶음, 빈 상태, 상세 |
| 수정 / 삭제 | `/runs/[id]/edit` | run_id 유지, "수정됨 · 원래 5.2 KM", 삭제 확인 시트 → History 이동 |
| Stats Card / Detail | `/stats`, `/stats/detail` | 수정 시 재계산(26.3→27.3km, 5'56"→5'53"), 삭제 시 제외(→6.2km, 1 RUN) |
| RUNNING 상태 | `/running` | 기록 0건 FIRST → 과거 날짜 저장 후 BASE(RUN 아님) → 오늘 저장 후 RUN(사람·동물 RUN 포즈·속도선) |
| 이벤트 19종 | `src/lib/events/track.ts` | 서버에 기록 확인(아래), 키·체중·발 사이즈·신발명·자유 입력 0건 |
| 분석 쿼리 | `docs/ANALYTICS_QUERIES.md` | PGlite(실제 Postgres 엔진)로 실행·수치 검증(`npm run verify:sql`). 실제 이용 수치는 아직 없음 |

### STEP 4 확정 정책 (2026-10-13)

- 신체 정보 부족 시 인원수 미표시 · 내 정보 수정 = 프로필 2단계 · 상품 설명은 검증된 정보(태그·공식 링크)만 · 미승인 이미지는 대체 실루엣
- 최소 유사 러너 5명 · 기본 ±5cm/±5kg/±10mm · 확대 ±10cm/±10kg/±20mm(사용자 선택 시) · 같은 보통 거리 구간 · 부족 시 가짜 통계 금지

### STEP 3 확정 정책 (2026-10-13 사용자 확정)

- 통계: 최근 4주 = 오늘 포함 28일 · 평균 페이스 = 총 시간 ÷ 총 거리 · Most Used Shoe = 누적 거리(신발 없는 기록 제외) · 기록 부족 시 임의 통계 없음
- 입력: 날짜 = 휴대폰 기본 달력 · 러닝화 변경 = 같은 화면 안 선택 · 새 화면 없음
- RUNNING: FIRST(기록 0) / BASE / RUN(오늘 날짜 기록 저장 성공, 같은 날 여러 건이면 최근 저장분, 그 날짜까지만) · 과거 날짜 저장은 RUN 아님 · 저장 실패 시 전환 없음
- 미구현 유지: FIRST 10K MILESTONE 비활성 · CURRENT MODE "—"

### 이벤트 검증 결과 (서버 모드 QA 세션, 2026-10-13)

| 이벤트 | 기록 | 비고 |
|---|---|---|
| app_open · landing_view · test_start · test_complete · reveal_view | ✅ | 화면당 1회(중복 없음) |
| test_question_view (신규) | ✅ q=1~5 | 문항 번호만, 답변 미수집 |
| profile_habits_complete · profile_runner_complete · profile_runner_skip · onboarding_complete | ✅ | 신체값은 "입력 여부(true/false)"만 |
| running_view · history_view · stats_view · stats_detail_view · items_view | ✅ | 방문마다 1건(재방문은 횟수만 증가) |
| run_save_success · run_save_fail · run_update · run_delete | ✅ | 실패 이벤트는 저장 실패 시험에서 기록 |

QA 세션(`?qa=1`)·`test:rls`·`check:supabase`로 생긴 사용자/이벤트는 분석 쿼리에서 제외됩니다.

## 실행한 테스트 (2026-10-13, STEP 3 브랜치)

| 검사 | 결과 |
|---|---|
| `npm run typecheck` · `npm run lint` | 통과 |
| `npm run test:identity` | 통과 (3,125 조합·WHY) |
| `npm run test:onboarding` | 통과 (11건) |
| `npm run test:stats` | 통과 (19건 — 이 테스트가 주간 구간이 한 주 밀리는 버그를 잡아 수정) |
| `npm run verify:sql` | 통과 — 마이그레이션 2회 적용(재실행 안전)·RLS·분석 쿼리 7개 수치 |
| `npm run check:assets` | 통과 |
| `npm run build` (demo) · `NEXT_PUBLIC_DATA_MODE=real npm run build` | 둘 다 성공 |
| `npm run check:supabase` (실제 DB) | 통과 — 테이블·열·트리거 |
| `npm run test:rls` (실제 DB) | 26/26 통과 — 로그아웃 접근 차단(42501), A/B 조회·수정·삭제·사칭 차단, 이벤트 수정·삭제 불가, DB 제약 |
| 브라우저 (서버 모드 배포용 빌드) | Landing → Test(BABCC) → Reveal(HOR) → Profile 1/2 → Shoe → RUNNING → 과거/오늘 기록 → History → Detail → Edit → Delete → Stats/Detail → ITEMS, 저장 실패·재시도, 새로고침 재조회 |
| 320px | `/runs/new`·`/runs`·`/stats`·`/stats/detail`·`/running` 가로 넘침 0건 |

브라우저 조작 방식: 앱 창이 가려지면 화면이 그려지지 않아, 버튼 조작은 화면 요소를 코드로 누르는 방식(`element.click()`)과 입력 이벤트로 했습니다. DB 확인은 페이지 안에서 같은 사용자 토큰으로 다시 조회했습니다(키 값은 출력하지 않음).

## 알려진 문제 · 한계

- 첫 화면 방문만으로 익명 사용자가 생깁니다(방문 집계용). 봇·대량 생성 방지(CAPTCHA 등)는 외부 공개 전 STEP 5에서 결정.
- 익명 사용자는 같은 브라우저에서만 이어짐 — 다른 브라우저·데이터 삭제 시 복구 불가(안내 문구는 STEP 5).
- `test:rls`·`check:supabase`를 실행할 때마다 검증용 익명 사용자가 남음(분석에서 제외됨).
- MY PROFILE(`/profile`) 수정 화면은 아직 임시 화면.
- `npm audit`: Next.js 15 내부 `postcss`(next 16.4.0에서 해결), ESLint 경로 `braces` — STEP 5 전 결정.
- WHY 1개만 나오는 조합 432/3,125(명세상 채우지 않음). 보조 성향은 저장만 함.

## DECISION NEEDED


- 시안의 큰 영문 제목 글꼴(Noto 계열로 보임) vs 확정 코드 Barlow Condensed — 코드 기준 유지 중
- 시안 없는 최소 구현: Current Shoe "직접 입력", 개인정보 안내(`/privacy`), RUNNING "?" → 결과 다시 보기
- Stats 문장의 시안 외 경우(이전 4주 0km, 감소, 동일, 페이스 비교) 문구 — 잠정 문구 사용 중
- CURRENT MODE 산출 규칙, FIRST 10K 조건

## GitHub

- 저장소: https://github.com/chorockai-lab/GearMatch-AI-MVP (Public)
- Issues: #1 STEP 1(완료) · #2 STEP 2(완료) · #3 STEP 3 · #4 STEP 4 · #5 STEP 5
- STEP 3 브랜치: `feat/step3-running` → PR → CI → main

## 남은 검증 항목

- 실제 휴대폰(iOS Safari·Android Chrome) 전체 흐름
- 새 Claude Code 세션에서 `.claude/skills` 3개 인식(현재 세션은 Skill 생성 전에 시작돼 호출 불가)
- Vercel 등 배포 환경에서 서버 모드 빌드(STEP 5)

## 사용자 설정 필요

- STEP 4: 러닝화 Excel 제공 (필요 필드는 Issue #4 참고)
- 서버 모드로 실제 내부 테스트를 하려면 `.env.local`의 `NEXT_PUBLIC_DATA_MODE=real`로 바꾼 뒤 다시 빌드 (지금은 `demo` 유지)
- (선택) Supabase CLI 사용 시 `docs/SUPABASE.md`의 `migration repair` 절차 1회

## 다음 STEP 5 작업 목록 (QA & Deployment)

1. 실제 휴대폰(iOS Safari · Android Chrome) 전체 여정 QA, 하단 탭·safe-area·키보드 가림
2. MY PROFILE 수정 화면(현재 임시) — 범위 결정 필요
3. 보안: `npm audit`(Next 16 업그레이드 여부), 익명 가입 봇 방지(CAPTCHA 등), Supabase 대시보드 보안 권고(Advisors) 확인
4. 개인정보 수집·이용 안내 문구 확정 후 `/privacy`
5. Vercel 프로젝트 생성 · 환경변수(`NEXT_PUBLIC_DATA_MODE=real`, Supabase URL·Publishable Key) · 내부 테스트 배포 · 배포본 서버 모드 검증
6. 실제 샘플 러너 데이터 수령 시 `items:import`로 적용 → ITEMS 정상 상태 검증

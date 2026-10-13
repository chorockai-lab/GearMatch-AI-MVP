# 개발 현황

> 최종 갱신: 2026-10-13 · 기준: 실제로 실행해 확인한 결과만 "완료"로 적습니다.

## STEP 진행

| STEP | 내용 | 상태 |
|---|---|---|
| 1 | Foundation — Next.js · RUNNING Main · 픽셀 에셋 · 판정 로직 | 검증 완료 |
| 2 | Onboarding — Landing → Test → Reveal → Profile 1/2 → Shoe → RUNNING | 구현·로컬 검증 완료 (PR·CI 확인 대기) |
| 3 | Running & Stats — Supabase · Run CRUD · History · Stats | 미착수 |
| 4 | ITEMS — 유사 러너 집계 · Product Detail · Saved | 미착수 (러닝화 Excel 필요) |
| 5 | QA & Deployment — 전체 QA · Vercel 내부 배포 | 미착수 |

진행률(온보딩 여정 7개 화면 기준): **7/7 구현 + 브라우저 검증**. 전체 MVP 기준으로는 STEP 1~2 완료, STEP 3~5 남음.

## STEP 2에서 구현한 것

| 화면 / 기능 | 경로 | 시안 | 검증 |
|---|---|---|---|
| Landing | `/` | 01_LANDING | 390·320 표시, CTA → Q1 |
| Runner Test Q1~Q5 | `/test/1`~`/test/5` | 02_RUNNER_TEST | 고르면 자동 이동, "이전"으로 답 수정, 앞 문항 미응답 시 되돌림 |
| Identity Reveal | `/reveal` | 03_IDENTITY_REVEAL | 8종 문구(명세 §5 원문), 동물 ×5 픽셀, WHY = 실제 고른 답만 |
| 결과 다시 보기 | `/runner-type` (RUNNING "?") | 시안 없음 → Reveal 재사용 | "RUNNING으로 돌아가기" |
| Profile 1 나의 러닝 습관 | `/onboarding/habits` | profile-step1 | 필수 3/3 전엔 "다음" 비활성 |
| Profile 2 나와 비슷한 러너 찾기 | `/onboarding/runner` | profile-step2 | 전부 선택, 숫자만 입력, 범위 밖이면 안내 + 계속하기 비활성, 건너뛰기 |
| Current Shoe | `/onboarding/shoe` | current-shoe(-selected) | 인기 6종·검색·직접 입력·모름·없음, 선택 전 CTA 비활성 |
| RUNNING Main 연결 | `/running` | FINAL (변경 없음) | 판정 동물 PNG·신발 표시, 기록 0건 = FIRST ENTRY, DEMO 표시 없음 |
| 데이터 계층 | `src/lib/onboarding/` | — | 화면은 `OnboardingRepository`만 사용. 지금은 **이 브라우저 임시 저장**, STEP 3에서 Supabase 구현으로 교체 |

## 실행한 테스트 (2026-10-13)

| 검사 | 결과 |
|---|---|
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 (경고 0) |
| `npm run test:identity` | 통과 — 3,125 조합 분포·동점 98/6/2/0·페르소나 9건 + **WHY 검사**(전 조합에서 고른 답만 인용, 최대 3개, 결정론) |
| `npm run test:onboarding` | 통과 — 화면 보호 이동 규칙 11건 |
| `npm run check:assets` | PNG 23개 64×48 RGBA |
| `npm run build` | 성공 |
| 브라우저 (개발 서버, 390×844) | HAM 페르소나 AABAC 전체 흐름 클릭 진행 → Reveal WHY = Q1·Q2·Q4 → 프로필 → Pegasus 42 → RUNNING HAM 표시 |
| 답변 수정 | Q1·Q2를 E로 변경 → 이전 결과 삭제 → CAT 재판정, WHY 2개(바꾼 답만) → RUNNING CAT 표시 |
| 320×640 | Landing·Q2·Profile 1/2·Shoe·RUNNING·Reveal(MOUNTAIN GOAT) 가로 넘침 0건 |
| 새로고침·빈 상태 | 새로고침 후 상태 유지. 저장 없음 상태로 `/running`·`/onboarding/shoe`·`/test/4` → `/test/1` |
| 배포용 빌드(`next start`) | OTT 페르소나 Reveal·보호 이동·"모델명 모름" RUNNING 표시, 콘솔 오류 0건 |

## 알려진 문제 · 한계

- WHY는 근거가 부족하면 채우지 않음: 3,125 조합 중 432개(13.8%)는 WHY 1개만 표시 (명세 "억지로 채우지 않는다"에 따름).
- 보조 성향(secondary)은 저장만 하고 화면에 표시하지 않음 — 시안에 표시 영역이 없음.
- 개발 서버에서 파일 이동 직후 webpack 청크 오류 1건 관찰 → 배포용 빌드에서는 재현 안 됨(개발 환경 전용으로 판단).
- `npm audit`: Next.js 15 내부 `postcss` 권고 2건(빌드 도구 경로). Next 16 메이저 업그레이드 필요 → 보류.
- Landing·Reveal의 픽셀 배치 계산이 RunnerScene(FINAL)과 중복 — 공통화하려면 FINAL 코드 수정이 필요해 보류.
- MY PROFILE(헤더 사람 아이콘, `/profile`)은 아직 임시 화면.

## DECISION NEEDED

- 시안 PNG의 큰 영문 제목은 Noto Sans 계열로 보이나, 확정 RUNNING Main 코드는 Barlow Condensed → 새 화면도 코드 기준(Barlow Condensed) 유지 중. 디자인 확인 필요
- Current Shoe "직접 입력하기" 화면 없음 → 같은 화면 안에 입력칸을 펼치는 최소 구현. 시안 필요
- "모델명을 몰라요" 선택 시 RUNNING의 CURRENT SHOE 표기: 현재 "모델명 모름" / "아직 없음"은 "—"
- 개인정보 수집·이용 안내 문구 없음 (`/privacy`는 안내 대기 화면)
- RUNNING "?" → 결과 다시 보기 연결 (시안 인덱스의 "확인 필요" 항목)
- 프로필 신체 입력 허용 범위(키 100~230, 체중 25~200, 발 200~330) — 승인 문서 없음, 오타 방지용
- '한 번에 뛰는 거리' 선택지: 3km 미만 / 3~5km / 5~10km / 10km 이상 (2026-10-13 사용자 결정)
- Landing 문구: 기존 승인안 "나는 어떤 동물형 러너일까?" 유지 (기획서 권고안 "나를 닮은 러닝 동물은?"으로 교체할지 확인)
- CURRENT MODE 산출 규칙 (없음 → "—"), FIRST 10K 등 MILESTONE 조건, RUN/MILESTONE 표시 기간, 같은 날 여러 기록의 대표 기준

## 사용자 설정 필요

- GitHub CLI 로그인(`gh auth login`) — PR·Issue·CI 확인에 필요
- STEP 3: Supabase 프로젝트 생성 후 URL·anon key를 `.env.local`에 직접 입력 (키는 대화·Git에 올리지 않음), Anonymous Auth 활성화
- STEP 4: 러닝화 Excel(제품·샘플 러너 데이터) 제공

## 다음 STEP 3 작업 목록

1. Supabase 연결 + Anonymous Auth + `0001_init_draft.sql` 적용·RLS 검증
2. `OnboardingRepository`의 Supabase 구현 → `onboardingRepository` 교체 (localStorage 데이터 이전 여부 결정)
3. Run 기록 생성·조회·수정·삭제, 평균 페이스 계산(`format.ts` 재사용)
4. Run History · Run Detail · Stats Card/Detail
5. 저장 성공 시에만 RUN 상태, MILESTONE은 조건 확정 전 비활성 유지

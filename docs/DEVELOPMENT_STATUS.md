# 개발 현황

> 최종 갱신: 2026-10-16 · 기준: 실제로 실행해 확인한 결과만 "완료"로 적습니다.

## STEP 진행

| STEP | 내용 | 상태 |
|---|---|---|
| 1 | Foundation — Next.js · RUNNING Main · 픽셀 에셋 · 판정 로직 | 완료 (main) |
| 2 | Onboarding — Landing → Test → Reveal → Profile 1/2 → Shoe → RUNNING | 완료 (main, PR #6) |
| 3 | Running & Stats — Supabase · Run CRUD · History · Stats · 이벤트 | 완료 (main, PR #7) |
| 4 | ITEMS — 유사 러너 집계 · Product Detail · Saved | 완료 (main, PR #8 · 실제 Supabase 검증) |
| 5 | QA & Deployment — 전체 QA · Vercel 내부 배포 | 진행 중 — Production 배포·자동 검증 완료, **실기기 QA 대기**(`docs/QA_DEVICE_CHECKLIST.md`, #12) |

## 실기기 QA (Issue #12) — iPhone 완료 · Android 대기

- **iPhone (2026-10-16):** Safari·카카오톡 인앱 정상, 양쪽 이미지 저장 성공, 브라우저별 기록 유지. Safari 일시적 로딩 오류 1회(자동 회복) — 기록만, 수정 보류
- **Android:** Chrome · 삼성 인터넷 · 카카오톡 인앱 — **미검증**, 체크리스트 §0-2로 진행 예정
- **앱 안 개인정보 삭제 완료 (PR #31 · main `8c866bb` · 2026-10-16):** `/privacy`의 `내 데이터 삭제` — DB 함수 `delete_my_data()`(매개변수 없음·호출자 본인·익명 계정만·anon 실행 불가, 서비스 키 없음)로 테스트 결과·프로필·기록·관심 신발·이벤트·익명 계정 삭제. 운영 DB 적용 · 실제 DB 테스트 · Preview/Production 신규 QA 계정 삭제 검증 완료(`docs/PRIVACY_DELETE.md`)
- **`/privacy` 안내 문구는 미확정** — 공식 이메일 · 참여 연령 · 테스트 기간 · 법무 검토 후 별도 승인으로 반영(`docs/PRIVACY_NOTICE_DRAFT.md`)
- **외부 테스트 준비 (#14, 2026-10-16 초안):** 개인정보 안내문 초안 `docs/PRIVACY_NOTICE_DRAFT.md`(승인 전 `/privacy` 미반영) · 보안 점검 `docs/SECURITY_REVIEW.md` · 참여자 안내·설문·지표 `docs/USER_TEST_KIT.md` · 분석 쿼리 §9~§11 추가(`verify:sql`로 실행 검증)
- **외부 테스트 최종 준비 (2026-10-19, 기능 개발 종료):** 확정 운영 정책(초록소프트 · chorock@chorock.co.kr · 한국 거주 만 19세 이상 · 2026-10-21~11-04 · 종료 후 3개월 보관) 반영 — 개인정보 안내문 초안·미확정 항목·법무 쟁점표 `docs/PRIVACY_NOTICE_DRAFT.md`, 콘솔 확인 경로·정상 기준·Advisor 경고별 권한 검토 `docs/SECURITY_REVIEW.md` §3, 안내문·설문 최종안·공유 전 필수 조건 `docs/USER_TEST_KIT.md`, 분석 기간 §0 `period`로 고정(`verify:sql` 통과), Android 체크리스트 §0-2 보강. **`/privacy` 게시·동의 UI는 법적 검토와 승인 후**. 외부 공유 가능 여부는 `USER_TEST_KIT.md` §5 조건으로 판단
- **계정 연결(#13) 보류 확정:** 브라우저별 익명 계정 분리 유지, 분리·복구 한계는 테스트 참여자에게 직접 안내(안내 UI 추가 없음)

- 절차·기록표: `docs/QA_DEVICE_CHECKLIST.md` (iPhone Safari · Android Chrome · 카카오톡 인앱, 항목별 정상/오류/미검증)
- 범위: 첫 방문 · 온보딩 · 재방문 · 러닝 기록(수정·삭제) · Stats · Runner/Stats 이미지 생성·공유·사진 저장 · ITEMS 저장 · 320/375/390 레이아웃
- 브라우저 간 익명 세션 분리(Safari ↔ 카카오톡 인앱 ↔ Chrome, 다른 기기, 데이터 삭제)는 **기존 한계**로 따로 기록 — 계정 연결(#13) 전까지 정상 동작
- 외부 사용자 테스트 중단 기준(치명적 오류 6가지)과 완료 기준은 체크리스트 §3
- QA 전용 **랜딩 다시 보기**: `/?qa=1&landing=1` — QA 표시가 있는 브라우저에서만 재방문 이동을 건너뜀. 결과가 있는 사용자가 테스트 버튼을 누르면 "테스트를 다시 할까요?" 확인(취소 시 아무것도 바뀌지 않음, 다시 하면 답을 바꾼 경우에만 동물 결과가 새로 바뀌고 기록·저장 신발은 유지). 일반 사용자 흐름 변화 없음 (PR A)

## ITEMS 콜드 스타트 (완료 · main `9250279` · PR #33 · 2026-10-19)

- 우선순위: 실제 러너 기본 → 실제 확대(자동) → 가상 Seed 예시 기본 → 예시 확대 → 활성 상품 둘러보기. 실제와 가상은 같은 집계에 넣지 않음(`public.items_match()`)
- 가상 Seed 300명(`npm run items:seed`, 시드 20261016): 사이즈코리아 8차 평균 키·BMI + 가정(발길이 등). 착용 횟수·누적 거리·인기 없음, 예시 목록에 숫자 없음
- 시뮬레이션: 기본 63~67% · 자동 확장 93~97% · 목록 표시 100%(대체 탐색). 120명 보고값 23.3%는 최고값 → 평균 17.4%로 정정
- 검증: SQL·TS 동일 결과(실제/예시/탐색 전 경로), 분리·문구 규칙 자동 테스트, 로컬 화면 5상태 390·320
- **운영 적용(2026-10-19):** DB 함수 → PR #33 병합·배포 → 가상 Seed 300명·441건(demo 행만). Production QA 5개 시나리오(예시 기본·예시 자동 확장·탐색·정보 미입력) 예상과 일치, 저장·러닝·Stats 정상, 콘솔 오류 0 — 상세 `docs/ITEMS_COLD_START.md` §8

## 캐릭터 v2 적용 (완료 · main, PR #26 · 2026-10-16 병합 `453b80a`)

- 사용자 확정 디자인 보드 기준: 러너(흰 티 · 차콜 쇼츠 · 라임 러닝화) 3포즈 + 동물 8종 × 3포즈(BASE/RUN/CELEBRATE). 고양이는 검정·흰색 턱시도
- 규격 유지: 64×48 PNG, 장면 ×3 · Reveal ×5, 발 아래 행 43. 러너가 주인공이 되도록 동물을 기존보다 작게 그림(배치 코드 변경 없음)
- `char-*-celebrate.png` 8개는 보관만 함 — 어떤 화면도 사용하지 않음(MILESTONE 비활성 유지, 동물은 기존처럼 BASE)
- 변경: `public/assets/{human,char}`, `src/lib/assets/sprites.ts`(bbox), `docs/asset-source/*.json`, `scripts/check-assets.mjs`(celebrate 8개 포함 31개 확인)
- 검증(로컬 production 빌드): typecheck · lint · test 5종 · verify:sql · check:assets · build 통과. 320/375/390에서 RUNNING(8종 RUN · BASE · 첫 기록 · 실제 기록 데이터) · Reveal 8종 · Runner/Stats 카드 PNG 저장 확인, 콘솔 오류 0, 결과가 있는 사용자의 `/` 재방문 → `/running`
- Preview(PR #26) 확인: 에셋 31개 해시 일치, 320/375/390 × 8종 × RUN/BASE 48조합 로드·겹침 0·장면 밖 0, QA 세션 온보딩 → Reveal → RUNNING → 기록 저장 → 재방문, 카드 PNG 생성
- **Production 확인 (`?qa=1`, 2026-10-16):** Vercel 배포 성공 · main CI 통과 · 에셋 31개 해시 일치 · `/dev/session` 404
  - QA 세션 온보딩 → Reveal(CAT, 새 턱시도 ×5) → RUNNING BASE → 기록 1건 저장 → RUN 포즈 → `/` 재방문 시 `/running` + 동물 결과 · 기록 · 저장 신발 유지
  - 320/375/390 × 8종 × RUN/BASE 48조합: 이미지 로드 정상, 러너·동물 겹침 0, 장면 밖 0 (320px 최소 간격 8px). 러너 123px · 동물 57~87px(390)
  - Runner Card 저장: 1170×1454 PNG, 화면 캐릭터 픽셀과 PNG 픽셀 100% 일치(러너 583/583 · 고양이 421/421), 다운로드 안내 문구 정상
  - 이번 병합은 Supabase(마이그레이션·스키마) · 환경 변수 · 분석 코드 변경 없음 → 기존 사용자 데이터 · PostHog `qa` 설정 그대로
- 실기기 확인은 #12에서 함께 진행 (QA 세션 테스트 계정 2개 생성: Preview 1 · Production 1, 모두 qa 표시)

## 기타 반영 (2026-10-15)

- 글꼴 자체 호스팅(PR #25): Google Fonts 빌드 실패(vercel/next.js#99114) 해결, Barlow 7개 선로딩 · Noto Sans KR 유니코드 분할 96개, 화면 픽셀 변화 없음
- PR #23(실기기 QA 체크리스트) · PR #24(이미지 바로 저장 · QA 랜딩 다시 보기) main 병합, Production 확인 완료

## Issue #16 카드 이미지 저장·공유 (main, PR #22 · 2026-10-15 병합)

| 항목 | 내용 · 검증 |
|---|---|
| 버튼 | RUNNING Runner Card 아래 · Stats Card 아래 `이미지 저장`(테두리 보조 버튼, 저장 UX v2에서 이름 변경). 기존 CTA 유지 |
| 생성 | 브라우저 Canvas. 화면의 카드를 390px 디자인 폭으로 복제해 글자 위치·글꼴·색·테두리를 그대로 옮기고, 픽셀 PNG는 정수 배율·nearest-neighbor로 그림. 3배(1170px 폭) PNG + 아래 작은 `GEARMATCH`, DEMO 데이터(로컬 DEMO 빌드 또는 RUNNING DEMO 미리보기)면 `DEMO DATA` 표기 — 실제 데이터 빌드에서는 없음. 서버 전송 없음 |
| 화면과 일치 | 같은 카드의 3배 화면 캡처와 픽셀 비교: 8개 경우 모두 눈에 띄게 다른 픽셀 0.2~1.5% (글자 가장자리 안티앨리어싱 차이) |
| 기기 폭 | 320px·390px에서 만든 PNG가 바이트 단위로 동일 |
| 흐름 (저장 UX v2, PR A) | `이미지 저장` 한 번으로: **iPhone** = 바로 공유 시트(사진 앱 저장용, PNG는 카드가 보이는 동안 미리 만들어 둠 — 공유 시트는 탭 직후에만 열리므로) · 실패/거부 시 미리보기 + 길게 눌러 저장 / **Android·기타** = 탭 시 생성 후 바로 다운로드("다운로드를 시작했어요" — 저장 완료로 표시 안 함) / **카카오톡 등 인앱** = 미리보기 + 길게 눌러 저장(기존 유지). 공유 취소는 문구 없음, 생성 실패는 안내 후 다시 누르기. 별도 미리보기·공유 보조 버튼은 이번 MVP에 없음 |
| 이벤트 | `card_image_create` {card} — 사용자가 누른 경우만(백그라운드 준비는 기록 안 함), `card_share_result` {card, method: create·share·download·longpress, result} (총 24종 유지). 신발명·이미지 내용 미전송 |
| 화면 수정 | RUN 카드 SHOE 행: 긴 신발명이 `SHOE`에 붙어 줄바꿈되던 문제 → 한 줄 말줄임(Stats 카드와 같은 규칙). CURRENT SHOE: 한글 단어 중간 줄바꿈 방지 |
| Production 확인 (자동, QA 세션) | 실제 데이터로 Runner(처음·러닝 후)·Stats PNG 생성 → 미리보기 → `이미지 저장` 다운로드 파일 생성(91KB·155KB), DEMO 표기 없음 · Preview에서 이벤트 `card_image_create`·`card_share_result`(cancelled) 각 1건, `qa: true`, PostHog 200 |
| 자동 검증 범위 | 헤드리스 Chrome(데스크톱 엔진): 공유 완료·취소·실패는 공유 기능을 흉내 내 확인, 카카오톡은 UA만 바꿔 확인 |
| **미검증 (실기기 필요, #12)** | iPhone Safari 공유 시트 → 사진 앱 저장 · iPhone 다운로드(파일 앱) · Android Chrome 공유·다운로드·갤러리 · 카카오톡 인앱(iOS·Android) 길게 눌러 저장, 공유 버튼 동작 · 실기기 화면에서 이미지 선명도·한글 |

## Production 확인 (2026-10-15, PR #20·#21·#22 병합 후)

랜딩 확정 이미지·C안 카피 · 테스트 시작 → `/test/1` · 재방문 → `/running` · `/dev/session` 404 · Supabase 데이터 유지(QA 사용자 러닝 1건 저장 후 재방문 표시) · PostHog 모드 `qa` — 모두 확인.
PR #22: 위 Issue #16 표의 "Production 확인" 행. 이 확인으로 QA 사용자 2명·러닝 1건 생성(08:40~08:42 UTC, 모두 QA 표시).
참고: 07:26~07:28 UTC 캡처 중 `?qa=1` 없는 Production 방문 1~3건이 Supabase에 남았을 수 있음(분석 시 제외).

## 랜딩 히어로 — 확정 원본 이미지 적용 (브랜치 `feat/landing-night-hero` · 2026-10-15)

| 항목 | 내용 |
|---|---|
| 이미지 | 사용자 확정 원본을 그대로 사용: `public/assets/landing/landing-hero-approved.png` (1672×941, 원본을 무손실 PNG로 변환·픽셀 동일 확인). 다시 그리거나 합성하지 않음 |
| 표시 | 가로 꽉 채움 + 원본 비율 유지(잘라내지 않음). 헤더·아래 여백 색은 이미지 위/아래 가장자리 색으로 연결. 이미지 위에 덮는 요소 없음 |
| 용량 | Next.js 이미지 최적화(화면 폭에 맞춰 WebP/AVIF, 품질 90). 640px 기준 약 60KB (원본 PNG 1.4MB) |
| 문구 (최종 C안) | 내 안에 숨어 있는 / 러닝 동물은? · 달릴 때 드러나는 나만의 성향, / 어떤 동물과 닮았을까요? · 5문항 · 약 1분 · CTA "숨은 러닝 동물 발견하기" — 모두 가운데 정렬, 기존 라벨·05 QUESTIONS 영역 삭제 |
| 상태 | **최종 확정** (2026-10-15) — 이미지 재생성·디자인 변경 없음 |
| 화면 확인 | 390×844·375×667·320×568 모두 이미지 전체 + CTA가 첫 화면에 보임. 원본과 390px 실제 화면 비교: 캐릭터·동물·구도 동일(평균 픽셀 차이 약 1%, 축소·압축 차이) |
| 참고 | 랜딩 캐릭터(빨간 상의)는 RUNNING 화면의 Pixel Runner와 외형이 다름 — 사용자 결정으로 랜딩만 원본 우선. 다른 화면은 변경 없음 |
| 미검증 | 실기기(iOS Safari·카카오톡 인앱) |

## MVP 안정화 1차 (브랜치 `feat/step5-revisit-dashboards` · 2026-10-15)

| 작업 | 상태 | 근거 |
|---|---|---|
| PostHog 대시보드 정의 — `GearMatch MVP KPI`(7개, QA 제외) · `GearMatch QA Monitor`(4개, QA만) | **생성 완료 (2026-10-15, 대시보드 2 · 차트 11)** — [KPI](https://us.posthog.com/project/662151/dashboard/2213495) · [QA Monitor](https://us.posthog.com/project/662151/dashboard/2213496) | `npm run posthog:check` 17건 통과(PostHog 공개 API 스키마·최신 쿼리 스키마), `test:analytics` 대시보드 검사 7건 |
| 재방문 진입 — `/`에서 저장된 상태 확인 후 RUNNING / 남은 단계 / Landing | 구현·검증 | `test:onboarding` entryPath 8건, 로컬 서버 모드·DEMO·Preview 브라우저 확인 (`docs/QA_REVISIT.md`) |
| 재접속 QA 도구 `/dev/session` (QA 전용, **Production 404**) | 구현·Preview 확인 · Production 빌드에서 404 확인 | 같은 브라우저: ID·동물·기록·Saved·PostHog ID 유지 / 저장 정보 삭제: 새 사용자(정상 제약) |
| 카카오톡·다른 브라우저 실기기 시나리오 | **미검증** (실기기 필요) | 절차·예상 동작: `docs/QA_REVISIT.md` · Issue #12 |
| 계정 연결 권장안 | 보고(구현 안 함) | `docs/ACCOUNT_LINKING.md` — 1단계 이메일 OTP 연결 권장 · Issue #13 |

- 현재 PostHog 수집 모드가 `qa`라 KPI 대시보드(QA 제외)는 실제 사용자 데이터가 없어 비어 있는 것이 정상.
- `landing_view`는 이제 Landing이 실제로 보였을 때만 기록(재방문자가 RUNNING으로 바로 가면 기록 안 함).

### 남은 작업 순서 (의존성 기준)

1. #12 모바일 실기기 QA (P1, 의존 없음)
2. #14 개인정보 안내·보안 (P1) → #13 계정 연결 (P1, SMTP는 #18 AWS 검토와 함께 결정)
3. #15 MY PROFILE (P2, 계정 연결 진입점 위치와 연동) · #16 카드 PNG 공유 (P2) · #17 QA DEMO 데이터 (P2)
4. #18 AWS 검토 (P2, 결정 먼저) · #19 랜딩 디자인 비교 (P3)

## PostHog 연동 (완료 · main, PR #10 · 2026-10-14 병합)

수집 모드: **`qa`** (`?qa=1` 세션만 PostHog로 전송). `all`은 개인정보 안내·동의 결정 전까지 켜지 않음.

### 배포 환경 검증 (2026-10-14)

| 항목 | Preview (`feat/posthog-analytics`) | Production (`main` e53cec8) |
|---|---|---|
| 빌드 반영 | `DATA_MODE=real` · 모드 `qa` · 토큰 `phc_` 형식 | 같음 (배포 번들에서 확인, 값은 출력하지 않음) |
| 일반 방문(QA 아님) | — | PostHog 요청 0건 · Supabase 기록 정상(app_open·landing_view) |
| `?qa=1` | `gearmatch.qa=1` 저장 | 같음 |
| 흐름 | Landing → Q1~Q5 → Reveal(WOL) → Profile 1 → 2단계 건너뛰기 → Shoe(모델명 모름) → RUNNING | 같음 |
| Supabase `events` | 14건 · 모두 `qa: true` · 중복 없음 · `test_question_view` q=1~5 각 1건 | QA 13건 · 모두 `qa: true` · 중복 없음 (app_open은 세션당 1회라 앞선 일반 방문에서 기록됨) |
| PostHog 전송 | `/e/` 9회 모두 200 | `/e/` 8회 모두 200 |
| 사용자 ID | PostHog distinct_id = Supabase 익명 사용자 ID | 같음 |
| PostHog Activity | 사용자가 직접 확인: landing_view ~ profile_habits_complete, 같은 사용자, `qa: true`(Boolean) | — (PostHog 화면은 사용자 로그인 필요) |

- 처음 Preview에서 Activity에 이벤트가 안 보인 원인: Vercel의 토큰 값이 Project API key(`phc_…`)가 아니었음. 수집 서버가 틀린 토큰에도 200을 돌려줘 겉보기엔 성공. → 값 수정 + 코드에서 `phc_` 형식이 아니면 PostHog를 켜지 않도록 함(`e4b50bd`).
- Production 확인용으로 익명 사용자 1명이 생김. QA 표시 이벤트가 있어 분석에서 제외됨(`docs/ANALYTICS_QUERIES.md` §0). 일반 방문 2건(app_open·landing_view)은 PostHog로 보내지 않음.
- PostHog 전송 본문(쿼리 제거·허용 속성만)은 아래 로컬 검증에서 실제 본문으로 확인. 배포본은 같은 코드.

### 로컬 검증

| 항목 | 결과 (2026-10-13, 로컬 서버 모드 빌드 + `NEXT_PUBLIC_POSTHOG_ENABLED=qa`) |
|---|---|
| 같은 이벤트 이중 기록 | Supabase `events`와 PostHog가 같은 track() 호출로 1건씩 — QA 세션에서 이벤트 목록 일치 |
| 사용자 식별 | PostHog distinct_id = Supabase 익명 사용자 ID (일치 확인) |
| 일반 방문(QA 아님) | PostHog 요청 0건 · SDK 미로드 · Supabase 기록 정상 |
| 전송 내용 | 주소 `?쿼리`·`#조각` 제거, referrer 미전송, 허용 속성만(답변·신체값·신발 이름 없음) — 실제 전송 본문 확인 |
| 꺼진 기능 | autocapture · pageview/pageleave · replay · heatmap · flags 등 → `/e/` 외 요청 없음 |
| PostHog 차단 시 | 화면·Supabase 저장 정상 |
| 대시보드 | `npm run posthog:dashboard` 준비 — **사용자 Personal API key 필요(미실행)** · 다음 작업 |
| 테스트 | `npm run test:analytics` 20건 (토큰 형식 검사 3건 포함) |

참고: 이 확인 중 QA 표시 없는 로컬 방문 1건(익명 사용자 1명, app_open·landing_view)이 Supabase에 남았습니다.

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

- iPhone Safari에서 일시적 정보 로딩 오류 1회(2026-10-16, 자동 회복) — 재현 조건 미확인, 기록만 유지.
- 첫 화면 방문만으로 익명 사용자가 생깁니다(방문 집계용). 봇·대량 생성 방지(CAPTCHA 등)는 외부 공개 전 STEP 5에서 결정.
- 익명 사용자는 같은 브라우저에서만 이어짐 — 다른 브라우저·카카오톡 인앱·데이터 삭제 시 복구 불가. iOS Safari는 7일 미방문 시 저장소를 지울 수 있음. 해결: 계정 연결(#13).
- `test:rls`·`check:supabase`를 실행할 때마다 검증용 익명 사용자가 남음(분석에서 제외됨).
- MY PROFILE(`/profile`) 수정 화면은 아직 임시 화면.
- `npm audit`: Next.js 15 내부 `postcss`(next 16.4.0에서 해결), ESLint 경로 `braces` — STEP 5 전 결정.
- WHY 1개만 나오는 조합 432/3,125(명세상 채우지 않음). 보조 성향은 저장만 함.

## DECISION NEEDED


- 시안의 큰 영문 제목 글꼴(Noto 계열로 보임) vs 확정 코드 Barlow Condensed — 코드 기준 유지 중
- 시안 없는 최소 구현: Current Shoe "직접 입력", 개인정보 안내(`/privacy`), RUNNING "?" → 결과 다시 보기
- Stats 문장의 시안 외 경우(이전 4주 0km, 감소, 동일, 페이스 비교) 문구 — 잠정 문구 사용 중
- CURRENT MODE 산출 규칙, FIRST 10K 조건
- `/privacy` 안내문(PR #37)·PostHog `consent` 모드(PR #40, 2026-10-22): 구현·테스트 완료, 병합·배포 대기 — 2026-10-22 사내 개인정보 책임자가 남은 4곳과 랜딩 동의 문구를 최종 승인 → `확정 전` 표시 없음. 확정·확인(2026-10-22): 문의 전화 02-534-2007, PostHog IP 저장 차단·GeoIP Pause·Free, 인증 감사 기록 0건. Production은 `qa` 유지. 운영 절차 `docs/POSTHOG.md`

## GitHub

- 저장소: https://github.com/chorockai-lab/GearMatch-AI-MVP (Public)
- Issues: #1 STEP 1 · #2 STEP 2 · #3 STEP 3 · #4 STEP 4 (모두 완료) · #5 STEP 5 (진행 중) · #12~#19 안정화 후속 작업
- PR: #6 STEP 2 · #7 STEP 3 · #8 STEP 4 · #9 STEP 5 인계 문서 · #10 PostHog · #11 현황 문서 — 모두 CI 통과 후 main 병합
- Vercel: PR마다 Preview, `main` 병합 시 Production 자동 배포 (#10 병합본 Production 배포 성공 확인)

## 남은 검증 항목

- **실기기 QA 전체 (#12)** — `docs/QA_DEVICE_CHECKLIST.md`: iPhone Safari·Android Chrome·카카오톡 인앱의 전체 흐름, 카드 이미지 공유·사진 저장, 320폭
- PostHog 대시보드 차트 화면 확인(생성은 완료) — KPI는 수집 모드 `qa`라 비어 있는 것이 정상
- Production에서 RUNNING 이후 흐름(기록 저장·Stats·ITEMS)의 PostHog 수집 — 이번엔 RUNNING 진입까지만 확인

확인됨(2026-10-14): `.claude/skills` 3개 인식 · Vercel Preview/Production 서버 모드 빌드(익명 로그인·Supabase 기록·PostHog QA 수집)

## 사용자 설정 필요

- STEP 4: 러닝화 Excel 제공 (필요 필드는 Issue #4 참고)
- 서버 모드로 실제 내부 테스트를 하려면 `.env.local`의 `NEXT_PUBLIC_DATA_MODE=real`로 바꾼 뒤 다시 빌드 (지금은 `demo` 유지)
- (선택) Supabase CLI 사용 시 `docs/SUPABASE.md`의 `migration repair` 절차 1회

## 다음 STEP 5 작업 목록 (QA & Deployment) — 상세: `docs/STEP5_QA_DEPLOY.md`

1. 실제 휴대폰(iOS Safari · Android Chrome) 전체 여정 QA, 하단 탭·safe-area·키보드 가림
2. MY PROFILE 수정 화면(현재 임시) — 범위 결정 필요
3. 보안: `npm audit`(Next 16 업그레이드 여부), 익명 가입 봇 방지(CAPTCHA 등), Supabase 대시보드 보안 권고(Advisors) 확인
4. 개인정보 수집·이용 안내 문구 확정 후 `/privacy`
5. Vercel 프로젝트 생성 · 환경변수(`NEXT_PUBLIC_DATA_MODE=real`, Supabase URL·Publishable Key) · 내부 테스트 배포 · 배포본 서버 모드 검증
6. 실제 샘플 러너 데이터 수령 시 `items:import`로 적용 → ITEMS 정상 상태 검증

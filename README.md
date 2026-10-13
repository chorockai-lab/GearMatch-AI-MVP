# GearMatch AI v2.0 — 모바일 웹 MVP

목표: 2026-10-16(금)까지 내부 테스트 가능한 MVP
흐름: Landing → Runner Test → Identity Reveal → Profile → RUNNING Main → Run 기록 → Stats → ITEMS

스택: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase(STEP 3에서 연결) · Vercel(배포 단계)

---

## 1. 내 컴퓨터에서 실행하기 (Windows 기준)

필요한 것: **Node.js 20.9 이상** (https://nodejs.org 의 LTS 버전)

PowerShell 또는 명령 프롬프트에서:

```bash
node -v                 # v20.9 이상인지 확인
git clone https://github.com/chorockai-lab/GearMatch-AI-MVP.git
cd GearMatch-AI-MVP
npm install             # 처음 한 번만 (몇 분 걸릴 수 있음)
npm run dev             # 개발 서버 실행
```

브라우저에서 열기:

| 주소 | 내용 |
|---|---|
| http://localhost:3000 | Landing — 실제 온보딩 흐름 시작 (테스트 → 결과 → 프로필 → 신발 → RUNNING) |
| http://localhost:3000/running | 내 RUNNING Main (온보딩을 마친 경우. 아니면 남은 단계로 이동) |
| http://localhost:3000/dev | 개발 미리보기 목록 (QA) |
| http://localhost:3000/running?state=run&animal=FOX | DEMO 미리보기: 상태(first · base · run · milestone)와 동물(HAM · CHE · HOR · GOA · FOX · WOL · OTT · CAT) 바꿔 보기 |
| http://localhost:3000/dev/states | 8종 × 상태 장면 한 번에 보기 |

휴대폰 크기로 보려면 브라우저 개발자 도구(F12) → 기기 툴바에서 390 × 844를 선택하세요.

검사 명령:

```bash
npm run test:identity   # 동물 판정 로직: 명세 §4·§7과 일치하는지 (3,125개 조합 전부)
npm run check:assets    # 캐릭터 PNG 23개가 있고 64×48인지
npm run typecheck       # 타입 검사
npm run lint            # ESLint
npm run build           # 배포용 빌드
```

> 처음 `npm run dev` 할 때 Google Fonts(Barlow, Barlow Condensed, Noto Sans KR)를 내려받으므로 인터넷 연결이 필요합니다.

## 2. 폴더 구조

```text
public/assets/        캐릭터 · 효과 PNG (gearmatch-running-assets v1.1 원본 그대로)
  char/  human/  fx/
src/app/              화면(라우트)
  page.tsx            Landing
  test/[n]/           Runner Test Q1~Q5
  reveal/             Identity Reveal  (runner-type/ = RUNNING "?" 결과 다시 보기)
  onboarding/         habits(프로필 1) · runner(프로필 2) · shoe(지금 신는 러닝화)
  running/            RUNNING Main
  dev/ dev/states/    개발 미리보기 · 8종 × 상태 QA 화면
  items/ runs/new/ stats/ profile/ privacy/   다음 STEP에서 구현할 자리(임시 화면)
src/components/
  onboarding/         Landing 장면 · Runner Test · Reveal · Profile · Current Shoe · 공통 Flow 부품
  running/            RunnerScene(사람+동물 장면) · RunnerCard · RecentRuns · RunningMainView
  ui/                 하단 탭 · 헤더 · 아이콘 · 임시 화면
src/lib/
  identity/           동물 8종 · 5문항 · 판정(점수 · 정규화 · 동점 규칙) · 결과 문구 · WHY
  onboarding/         온보딩 데이터 저장 계층 (STEP 2: 이 브라우저 임시 저장 → STEP 3: Supabase로 교체)
  running/            카드 상태 정책(잠정) · 페이스/표시 형식 · 마일스톤(확정 전, 꺼둠)
  assets/sprites.ts   PNG 기준점(bbox) 데이터
  demo/               DEMO 데이터 (실제 데이터와 구분, 화면에 DEMO DATA 표시)
  supabase/           Supabase 연결 (환경변수가 없으면 DEMO 모드)
supabase/migrations/  DB 스키마 초안 (아직 적용 안 함, STEP 3)
scripts/              판정 테스트 · 에셋 검사
docs/asset-source/    스프라이트 원본 데이터 · 내보내기 검사 기록
```

## 3. 지금 상태 (STEP 2)

- 온보딩 결과(동물·답변·프로필·신발)는 **이 브라우저에만 임시 저장**됩니다(localStorage). 서버 저장이 아니므로 다른 브라우저·시크릿 모드·사이트 데이터 삭제 시 사라집니다. STEP 3에서 Supabase로 교체합니다.
- 러닝 기록 저장은 STEP 3에서 연결합니다. `?state=` 미리보기 화면의 기록 값은 모두 **DEMO**입니다.
- 카드 상태 규칙은 `src/lib/running/state-policy.ts` 한 곳에 모아 두었습니다(잠정 정책).
- 캐릭터 배치 규칙(정수 ×3 확대 · 기준점 고정 · 동물 속도선이 사람을 가리지 않음)은 `src/components/running/RunnerScene.tsx`에 있습니다.

## 4. 개발 현황

진행 상황·테스트 결과·남은 일은 [`docs/DEVELOPMENT_STATUS.md`](docs/DEVELOPMENT_STATUS.md)를 봅니다.

## 5. 확인이 필요한 항목

| 항목 | 현재 처리 |
|---|---|
| CURRENT MODE 산출 규칙 | 규칙 문서 없음 → 실제 데이터에서는 “—” 표시. DEMO만 시안 값(BUILDING SPEED) |
| FIRST 10K 판정 조건 | 명세에 없음 → 자리만 만들고 꺼 둠(`milestones.ts`) |
| 성취 기록 수정 · 삭제 시 처리 | 미정 |
| Runner Code 화면 | v1.8 문서에는 있으나 v2.0 기획 · 킥오프 흐름에서 제외 → 넣지 않음(익명 로그인 예정) |
| 브라우저 변경 · 데이터 삭제 후 복구 | MVP에서 지원하지 않음(같은 브라우저만). 복구 기능이 있는 것처럼 표시하지 않음 |

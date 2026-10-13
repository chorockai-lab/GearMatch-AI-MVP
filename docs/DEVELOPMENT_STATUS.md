# 개발 현황

> 최종 갱신: 2026-10-13 · 기준: 실제로 실행해 확인한 결과만 "완료"로 적습니다.

## STEP 진행

| STEP | 내용 | 상태 |
|---|---|---|
| 1 | Foundation — Next.js · RUNNING Main · 픽셀 에셋 · 판정 로직 | 검증 완료 |
| 2 | Onboarding — Landing → Test → Reveal → Profile → Shoe → RUNNING | 진행 예정 |
| 3 | Running & Stats — Supabase · Run CRUD · History · Stats | 미착수 |
| 4 | ITEMS — 유사 러너 집계 · Product Detail · Saved | 미착수 (러닝화 Excel 필요) |
| 5 | QA & Deployment — 전체 QA · Vercel 내부 배포 | 미착수 |

## STEP 1 검증 결과 (2026-10-13, 로컬 Windows · Node 26 · npm 11)

| 검사 | 명령 | 결과 |
|---|---|---|
| 의존성 설치 | `npm install` | 성공 |
| 타입 검사 | `npm run typecheck` | 통과 |
| ESLint | `npm run lint` | 통과 (이번에 추가: eslint 9 + eslint-config-next) |
| 동물 판정 | `npm run test:identity` | 전부 통과 — 3,125 조합 분포·동점 98/6/2/0·페르소나 9건 명세 §7과 일치 |
| 픽셀 에셋 | `npm run check:assets` | PNG 23개 모두 64×48 RGBA |
| 빌드 | `npm run build` | 성공 (11개 라우트) |
| 브라우저 | `/running?state=first&animal=CHE` 390×844 | 사람+치타 BASE, 첫 진입 문구, 빈 기록 표시 확인 |

## 알려진 문제 · 경고

- `npm audit`: Next.js 15 내부 `postcss` 보안 권고 2건(빌드 도구 경로). 해결하려면 Next 16 메이저 업그레이드 필요 → MVP 일정상 보류.

## DECISION NEEDED

- CURRENT MODE 산출 규칙 (없음 → 실제 데이터는 "—")
- FIRST 10K 등 MILESTONE 조건, RUN/MILESTONE 표시 기간, 같은 날 여러 기록의 대표 기준
- 시안 PNG의 큰 영문 제목은 Noto Sans 계열로 보이나, 확정 RUNNING Main 코드는 Barlow Condensed 사용 → 코드 기준 유지 중. 디자인 확인 필요

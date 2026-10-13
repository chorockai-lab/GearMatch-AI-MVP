# STEP 5 — QA & Vercel 내부 배포 준비

> 작성: 2026-10-13 · STEP 1~4 main 반영 후. 항목마다 **누가** 하는지 표시했습니다 (사용자 / Claude).

## 1. 보안 취약점 (우선)

`npm audit` (2026-10-13):

| 패키지 | 심각도 | 경로 | 해결 방법 | 판단 |
|---|---|---|---|---|
| `postcss@8.4.31` | high | Next.js 15.5.27 내부(빌드) | next 16.4.0 (메이저) | 배포 전 결정 — Next 16 업그레이드 시 전체 회귀 테스트 필요 |
| `next` | moderate | 위 postcss 때문 | next 16.4.0 | 〃 |
| `braces` · `micromatch` · `fast-glob` · `@next/eslint-plugin-next` | high | `eslint-config-next`(ESLint 전용, 배포물 미포함) | eslint-config-next 14.2.35(하향) | 배포물 영향 없음 — 보류 가능 |
| `exceljs` · `uuid` | moderate | ITEMS 가져오기 스크립트(개발 전용) | exceljs 3.4.0(하향) | 배포물 영향 없음 — 보류 가능 |

- [ ] (사용자) Next 16 업그레이드를 STEP 5에서 할지 결정 → (Claude) 업그레이드 브랜치 + 전체 테스트·화면 회귀
- [ ] (Claude) 배포 전 `npm audit --omit=dev` 재확인, 결과 기록

## 2. 익명 로그인 봇 방지 (외부 공개 전 필수, 내부 테스트는 선택)

현재: 첫 화면 방문만으로 Supabase 익명 사용자가 생깁니다(방문 집계용).

- [ ] (사용자) Supabase 대시보드 → Authentication → **Rate Limits**에서 익명 가입 한도 확인(IP당 시간당 제한)
- [ ] (사용자) 공개 전 **CAPTCHA**(Cloudflare Turnstile 또는 hCaptcha) 사용 여부 결정 — 사용 시 사이트 키 발급 후 Supabase 대시보드 Authentication 설정의 CAPTCHA(봇 방지) 항목에 등록
- [ ] (Claude) CAPTCHA 결정 시 `signInAnonymously({ options: { captchaToken } })` 연결 + 위젯 배치(화면 디자인 확인 필요)
- [ ] (사용자) 대시보드 **Advisors(Security/Performance)** 경고 확인 후 공유

## 3. 개인정보 안내

- [ ] (사용자) 수집 항목·목적·보관 기간·삭제 요청 방법 문구 확정 — 수집 중인 항목: 테스트 답변, 러닝 습관, 키·체중·발 사이즈(선택), 신발, 러닝 기록, 저장한 신발, 행동 이벤트(신체값·자유 입력 미포함)
- [ ] (Claude) `/privacy` 화면에 확정 문구 반영(현재 대기 화면)
- [ ] (사용자) "다른 브라우저·데이터 삭제 시 기록 복구 불가" 안내 위치 결정

## 4. 실제 모바일 점검

- [ ] (사용자) iPhone Safari · Android Chrome 실제 기기로 전체 여정: Landing → Test → Reveal → Profile → Shoe → RUNNING → 기록 추가/수정/삭제 → Stats → ITEMS → 저장
- 확인 포인트: 하단 탭·고정 버튼과 안전 영역(홈 인디케이터), 숫자 키패드 입력, 날짜 달력, 키보드가 버튼을 가리는지, 글자 잘림, 픽셀 캐릭터 선명도
- [ ] (Claude) 발견 문제를 `fix/` 브랜치로 수정 · PR

## 5. Vercel 내부 테스트 배포

- [ ] (사용자) Vercel에서 GitHub 저장소 `chorockai-lab/GearMatch-AI-MVP` 연결(프로젝트 생성)
- [ ] (사용자) Vercel Project → Settings → Environment Variables (값은 대화·Git에 올리지 않음)

| 이름 | 값 | 환경 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Production · Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) — **secret 키 금지** | Production · Preview |
| `NEXT_PUBLIC_DATA_MODE` | `real` (서버 저장) | Production · Preview |
| `NEXT_PUBLIC_ITEMS_DEMO` | 설정하지 않음 | — |

- [ ] (Claude) 배포본에서 `?qa=1` QA 세션으로 전체 여정·이벤트·RLS 재확인, 결과 기록
- `NEXT_PUBLIC_*` 값은 빌드 시 고정 → 값을 바꾸면 Vercel에서 **Redeploy** 필요

## 6. 데이터

- [ ] (사용자) 실제 샘플 러너 데이터 제공 시 `docs/ITEMS_DATA.md` 양식 → (Claude) `npm run items:import` 검증 → (사용자) 생성 SQL을 SQL Editor에서 실행
- QA/테스트 데이터는 분석에서 자동 제외(`docs/ANALYTICS_QUERIES.md`). 운영 전 정리 필요 시 별도 결정

## 7. 남은 제품 결정 (STEP 5 범위 확인)

- MY PROFILE 수정 화면(현재 임시) 구현 여부
- 영문 큰 제목 글꼴(시안 vs 확정 코드)
- Stats 시안 외 문구(감소·동일·이전 0km)

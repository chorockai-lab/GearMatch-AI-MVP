---
name: gearmatch-ux
description: Use when implementing or changing any GearMatch MVP screen (Landing, Runner Test, Identity Reveal, Runner Profile, Current Shoe, RUNNING Main, MY PROFILE, ITEMS) or any visual element, layout, copy, or pixel character placement in this project.
---

# GearMatch UX — 화면 구현 절차

원칙: **Handoff 화면을 그대로 구현한다. 새 UI·새 기능을 만들지 않는다.**

## 1. 원본 확인 (코드 작성 전)

1. `reference/ui-handoff/UI_SCREEN_INDEX.md`에서 대상 화면의 파일·이동 대상·상태(FINAL/UPDATE/MISSING)를 찾는다.
2. 해당 PNG(780×1688 = 390×844의 2배)를 Read로 직접 본다. 길면 `*-full.png`.
3. 화면이 MISSING이면 만들지 말고 `docs/DEVELOPMENT_STATUS.md`의 DECISION NEEDED에 적는다. 최소 동작이 꼭 필요하면 기존 컴포넌트 조합으로만 만들고 "시안 없음"을 기록한다.

## 2. 기존 코드 조사

- 공통: `src/components/ui/` (AppFrame·AppHeader·BottomNav·icons)
- RUNNING: `src/components/running/` — **FINAL. 디자인 변경 금지**, 데이터 연결만.
- 픽셀: `src/lib/assets/sprites.ts`, `public/assets/{char,human,fx}/`

있는 것을 재사용하고, 같은 역할의 컴포넌트를 새로 만들지 않는다.

## 3. 시각 규칙

| 항목 | 값 |
|---|---|
| 색 | Black `gm-bg` #0A0A0A · Warm White `gm-tx` #F2F1EC · Lime `gm-lime` #D7FF2E · 회색 `gm-g1/g2`, 선 `gm-line*` (globals.css 토큰만 사용) |
| 글꼴 | 큰 영문 `--font-bc`(Barlow Condensed) · 영문 라벨 `--font-bl`/`.gm-label` · 한글 `--font-kr` |
| 픽셀 | 64×48 원본을 **정수 배율**(×3 장면, ×5 Reveal)로, `.px` 클래스(nearest-neighbor) |
| 캐릭터 | 동물 8종 `char-{id}-{base|run}.png`, 사람 `human-{base|run|celebrate}.png`. 새 그림 금지 |
| 레이아웃 | 좌우 24px 여백, 주요 CTA 높이 60px Lime, 하단 고정 CTA는 safe-area 포함 |

## 4. 화면 이동 보존

Landing → Runner Test Q1~Q5 → Identity Reveal → Profile 1 → Profile 2(건너뛰기 가능) → Current Shoe → RUNNING Main.
CTA 문구·진행 표시(01/05, 01/03)는 시안 그대로.

## 5. 확인 (완료 전 필수)

1. 개발 서버 실행(`.claude/launch.json`의 `gearmatch-dev`) 후 브라우저에서 **390×844**와 **320×640** 둘 다 스크린샷.
2. 시안 PNG와 나란히 비교: 문구, 순서, 색, 버튼 상태, 픽셀 선명도.
3. 글자 잘림·가로 스크롤·하단 CTA/탭 가림이 없는지 확인.
4. 확인 못 한 항목은 "미검증"으로 보고한다.

## 흔한 실수

- 시안 PNG를 `<img>`로 통째로 넣기 → 금지. 텍스트·CTA·동물은 개별 요소로.
- 점수·퍼센트를 화면에 표시 → 금지.
- RUNNING Main 간격·글꼴을 "시안에 더 맞게" 수정 → 금지(FINAL). 차이는 기록만.

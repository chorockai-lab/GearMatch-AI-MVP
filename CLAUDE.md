# GearMatch AI v2.0 — MVP

모바일 웹 MVP. 목표: 2026-10-16까지 **내부 테스트 가능한** 상태. 기능 범위를 늘리지 않는다.
상세 진행 상황은 `docs/DEVELOPMENT_STATUS.md`. 먼저 읽고 시작한다.

## 기준 문서 (충돌 시 위가 우선)

1. Animal Identity v2.0 명세 — 5문항·8종·점수·WHY (`reference/GearMatch_AI_v2.0_Animal_Identity_MVP_Spec.md`)
2. Development Reference — 전체 기능·여정·확정 정책 (`reference/GEARMATCH_MVP_DEVELOPMENT_REFERENCE_2026-10-13.md`)
3. Final UI Handoff — 화면 디자인 (`reference/ui-handoff/UI_SCREEN_INDEX.md` + PNG)
4. 기존 코드 — 재사용할 실제 구현

`reference/`는 로컬 전용(.gitignore). 공개 저장소에 올리지 않는다. 없으면 사용자에게 받는다.

## 고정 규칙

- 동물은 **8종 고정**: HAM CHE HOR GOA FOX WOL OTT CAT. 구 6유형·Runner Code 화면을 되살리지 않는다.
- WHY는 **사용자가 실제로 고른 답변만** 근거로 쓴다. 점수·퍼센트·신뢰도는 화면에 표시하지 않는다.
- 승인된 UX·RUNNING Main 디자인을 임의로 바꾸지 않는다. 새 UI를 창작하지 않고 Handoff를 구현한다.
- 픽셀 PNG는 `public/assets/` 기존 자산을 재사용(정수 배율, nearest-neighbor). 새 캐릭터를 만들지 않는다.
- 확정되지 않은 정책(FIRST 10K, CURRENT MODE, RUN 유지 기간 등)은 임의 구현하지 않고 `DECISION NEEDED`로 남긴다.
- 임시 저장(localStorage)을 서버 저장처럼 표시하지 않는다. DEMO 데이터는 DEMO로 표시한다.

## 작업 방식

- 작은 단위로 변경하고, 변경 후 바로 검사한다: `npm run typecheck` · `npm run lint` · `npm run test:identity` · `npm run test:onboarding` · `npm run test:stats` · `npm run test:items` · `npm run test:analytics` · `npm run verify:sql` · `npm run check:assets` · `npm run build`
- Supabase(서버 모드) 변경 시: `npm run check:supabase` · `npm run test:rls` (실제 DB 사용, `docs/SUPABASE.md` 참고). 마이그레이션 파일은 수정하지 말고 새 파일로 추가
- 화면 작업 → `gearmatch-ux` Skill, 동물 판정·WHY → `gearmatch-identity` Skill, 완료·인계 → `gearmatch-quality` Skill.
- **실행해서 확인하지 않은 것은 완료로 보고하지 않는다.** 실패·미검증은 그대로 적는다.

## GitHub

- 저장소: https://github.com/chorockai-lab/GearMatch-AI-MVP (Public)
- `main` = 검증된 안정 버전. 작업은 `feat/<step>-<name>` 또는 `fix/<name>` 브랜치 → PR → CI 통과 → 병합. `develop` 없음.
- Commit 메시지: `feat:` `fix:` `chore:` `docs:` `test:` 접두어 + 한 줄 요약.
- force push·이력 삭제 금지. `.env*`(예외 `.env.example`), 키, 개인정보, `reference/`, ZIP은 커밋하지 않는다.

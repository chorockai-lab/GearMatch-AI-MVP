---
name: gearmatch-quality
description: Use when a GearMatch feature or fix is about to be reported as done, committed, pushed, or opened as a PR, or when checking GitHub/CI handoff state for this project.
---

# GearMatch Quality — 완료·인계 점검

원칙: **실행해서 통과를 본 것만 "완료"라고 쓴다.** 나머지는 "미검증" 또는 "실패"로 적는다.

## 1. 변경 검토

```bash
git status --short
git diff --stat
git diff
```
의도하지 않은 파일, 디버그 코드, 큰 바이너리가 없는지 본다.

## 2. 자동 검사 (모두 실행, 결과를 그대로 기록)

```bash
npm run typecheck
npm run lint
npm run test:identity
npm run test:onboarding
npm run test:stats
npm run verify:sql
npm run check:assets
npm run build
```

서버 저장(Supabase) 관련 변경이면 추가로 실행한다(실제 DB 사용, 검증용 익명 사용자가 생김):

```bash
npm run check:supabase
npm run test:rls
```

## 3. 민감정보·불필요 파일 검사 (Push 전 필수 — 저장소는 Public)

```bash
git ls-files | grep -Ei '(^|/)\.env|reference/|incoming/|\.zip$|node_modules|\.next/' || echo "clean"
git diff --cached | grep -Ei 'service_role|sk-[a-z0-9]{10}|ghp_[A-Za-z0-9]{10}|eyJhbGciOi|password\s*=' || echo "no secrets"
```
하나라도 걸리면 Push하지 않고 원인을 제거한다. 공개 여부가 애매한 자료는 사용자에게 묻는다.

## 4. 실제 화면 확인

`gearmatch-ux` Skill §5 절차로 390px·320px에서 주요 흐름을 직접 실행한다:
Landing → Q1~Q5(이전으로 답 수정 포함) → Reveal → Profile 1 → Profile 2 → Current Shoe → RUNNING Main, 그리고 새로고침 후 상태.

## 5. 기록과 보고

- `docs/DEVELOPMENT_STATUS.md` 갱신: 완료/미완료, 실행한 테스트와 결과, 막힌 문제, DECISION NEEDED, 다음 STEP.
- 진행률은 "구현 + 검증된" 기능 수 기준으로 계산한다.
- Commit → Push → PR(구현 내용·변경 파일·테스트·화면 검증·잔여 문제) → `gh pr checks`로 CI 확인.
- CI 실패 상태로 main에 병합하지 않는다. force push 금지.

## 보고 형식

| 항목 | 결과 | 근거 |
|---|---|---|
| typecheck / lint / identity / onboarding / stats / sql / assets / build | 통과·실패 | 명령 출력 |
| 화면 흐름 390 / 320 | 확인·미확인 | 스크린샷 |
| 민감정보 검사 | clean / 발견 | 명령 출력 |
| CI | 성공·실패·대기 | PR 링크 |

---
name: gearmatch-identity
description: Use when touching Animal Identity v2.0 in this project — Runner Test questions or answers, scoring, normalization, tie-breaks, primary/secondary animal, Identity Reveal copy, WHY evidence, saved identity fields, or src/lib/identity/.
---

# GearMatch Identity — 판정·결과·WHY

원칙: **이미 구현된 판정 로직을 다시 만들지 않는다. 명세와 대조해 검증한다.**
명세 원문: `reference/GearMatch_AI_v2.0_Animal_Identity_MVP_Spec.md` §2~§5, §7.

## 코드 위치

| 파일 | 역할 |
|---|---|
| `src/lib/identity/animals.ts` | 8종 ID·이름 |
| `src/lib/identity/questions.ts` | 5문항×5선택지 원문, Primary/Secondary, 버전 |
| `src/lib/identity/scoring.ts` | 점수·정규화(교차곱)·동점 4단계·보조 성향·mixed_signal |
| `src/lib/identity/reveal-copy.ts` | 헤드라인·성향 분석 원문 (명세 §5) |
| `src/lib/identity/why.ts` | 실제 고른 답변 → WHY 1~3개 |
| `src/lib/onboarding/repository.ts` | 결과 저장 필드(명세 §4.5)·재계산 |
| `scripts/test-identity.ts` | 3,125 조합·페르소나·WHY 검증 (`npm run test:identity`) |

## 변경 절차

1. 명세 해당 절을 먼저 읽는다. 문구·점수는 **원문 그대로**(오타 수정도 명세 변경 없이 하지 않는다).
2. 변경 후 `npm run test:identity` — 반드시 `ALL CHECKS PASSED`.
3. 점수 규칙을 바꾸면 `SCORING_VERSION`을 올리고 기존 결과와 구분한다(명세 §9-5). 사용자 승인 없이 바꾸지 않는다.

## 반드시 지킬 것

- 5문항 × 5선택지, 1문항 1선택. 가중치 Q1=3 Q2=4 Q3=5 Q4=4 Q5=3, Secondary +1.
- 정규화 = raw / primary_opportunity (HAM11 CHE13 HOR12 GOA14 FOX12 WOL11 OTT12 CAT10), 비교는 정수 교차곱.
- 동점: HOW(Q2~Q4) Primary 점수 → Primary 선택 횟수 → Q3→Q2→Q4→Q1→Q5 첫 Primary → 코드 순서.
- 보조 성향은 이미지 없이, **그 유형을 Primary로 고른 답이 1개 이상일 때만** 언급.
- WHY: **대표 동물을 Primary로 고른 답변**을 근거로 2~3개. 부족하면 대표 동물을 Secondary로 가진 답변으로 보충. 그래도 2개 미만이면 억지로 채우지 않는다. **고르지 않은 선택지는 절대 쓰지 않는다.**
- 같은 답변 → 항상 같은 동물·보조·WHY (결정론).
- 화면에 점수·퍼센트·신뢰도 표시 금지. mixed_signal은 내부 값.
- 저장 필드: `animal_type_v2`, `secondary_type_v2`, `test_answers_v2`, `test_schema_version`, `scoring_version`, `evaluated_at`.

## 검증 체크리스트

- [ ] 3,125 조합 분포 = 명세 §7 표, 8종 모두 출현, 동점 98/6/2/0
- [ ] 페르소나 9건 대표/보조 일치
- [ ] 3,125 조합 전부: WHY 항목이 모두 사용자가 고른 선택지에서 나옴, 개수 ≤ 3
- [ ] 답변 수정 후 결과 재계산(브라우저에서 확인)

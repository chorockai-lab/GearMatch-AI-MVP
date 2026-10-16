# ITEMS 데이터 가져오기

## 구조

| 테이블 | 내용 | 앱에서 읽기 |
|---|---|---|
| `products` | 러닝화 목록 (Product DB v0.3 `01_Product_Master`) | 로그인 사용자 — `active = true`인 상품만 |
| `seed_runners` | 샘플 러너의 키·체중·발 사이즈·보통 거리 | **불가** (원본 신체 정보는 서버 밖으로 나가지 않음) |
| `seed_runner_shoes` | 샘플 러너가 신는 상품 (+ 선택: 달린 횟수·거리) | **불가** |
| `saved_products` | 사용자가 저장한 신발 | 본인 행만 (RLS) |
| `runners_like_you(p_wide)` | 위 데이터를 **집계해서** 돌려주는 함수 | 로그인 사용자 — 본인 프로필 기준 결과만 |

`runners_like_you`는 호출한 사용자 **본인의** `runner_profiles`(키·체중·발 사이즈·보통 거리)로 비슷한 러너를 찾고,
"N명 중 X명"(고유 러너 수)과 비율만 돌려줍니다. 비슷한 러너가 5명 미만이면 상품 목록 자체를 돌려주지 않습니다.

## 매칭 규칙 (2026-10-13 확정)

| 범위 | 키 | 체중 | 발 사이즈 | 보통 거리 | 언제 |
|---|---|---|---|---|---|
| 기본 | ±5cm | ±5kg | ±10mm | 같은 구간 | 항상 |
| 확대 | ±10cm | ±10kg | ±20mm | 같은 구간 | 기본에서 5명 미만이면 **자동**(2026-10-17, `docs/ITEMS_COLD_START.md`) |

- 순서: 실제 러너 기본 → 실제 확대 → 가상 Seed 예시 기본 → 예시 확대 → 활성 상품 둘러보기 (`public.items_match()`). 실제와 가상은 섞지 않음
- 가상 Seed(`demo`)는 숫자 없는 예시 목록으로만 표시. 서버 DB 입력은 `npm run items:seed`(demo 행만 교체)로만 — `items:import`는 여전히 `demo`를 거부
- 키·체중·발 사이즈 중 하나라도 없으면 계산하지 않고 "내 정보 추가하기"
- 동물 유형은 쓰지 않습니다. 같은 러너가 같은 신발로 여러 줄 있어도 1명으로 셉니다.

## 상품 가져오기 (실제 DB)

```bash
npm run items:import -- --products "<경로>/06-A_GearMatch_AI_Product_Recommendation_DB_v0.3_수정본.xlsx" --sql supabase/seed/items.generated.sql
```

생성된 `supabase/seed/items.generated.sql`을 Supabase SQL Editor에서 실행합니다(여러 번 실행해도 같은 결과 — upsert).
`supabase/seed/`는 Git에 올리지 않습니다.

상품 처리 규칙:
- 앱에 표시(`active`) = `market = KR` · `kr_sale_confirmed = TRUE` · `product_status = CURRENT` (v0.3: 63개 중 50개)
- 이미지는 `08_Product_Images`에서 `usage_status = APPROVED`이고 `active = TRUE`이며 https 주소일 때만 사용.
  그 외에는 앱의 대체 실루엣("IMAGE PLACEHOLDER"). v0.3은 6개 모두 PENDING → 전부 대체 이미지
- 공식 링크는 https 주소만 사용

## 샘플 러너 가져오기 (실제 데이터를 받으면)

`data/templates/`의 CSV 머리글을 그대로 쓰거나, 같은 열 이름의 Excel 시트로 작성합니다.

**seed_runners.csv**

| 열 | 필수 | 값 |
|---|---|---|
| runner_id | ✅ | 중복 없는 ID (≤ 40자). 이름·연락처 등 개인 식별 정보 금지 |
| height_cm | ✅ | 100–230 |
| weight_kg | ✅ | 25–200 |
| shoe_size_mm | ✅ | 200–330 |
| typical_run_distance | ✅ | `LT_3` `D3_5` `D5_10` `GTE_10` 또는 `3km 미만` `3~5km` `5~10km` `10km 이상` |
| weekly_distance | 선택 | `LT_5` `D5_15` `D15_30` `GTE_30` `UNKNOWN` |
| data_source | ✅ | `survey` `partner` `internal` (`demo`는 실제 DB에 넣을 수 없음) |

**seed_runner_shoes.csv** — `runner_id`, `product_id`(products에 있는 값), 선택 `run_count`(정수), `total_km`

```bash
npm run items:import -- --products "<Product DB>.xlsx" --runners runners.csv --runner-shoes runner_shoes.csv --sql supabase/seed/items.generated.sql
```

검증에 실패한 행이 하나라도 있으면 아무것도 쓰지 않고 행 번호·열·이유를 출력합니다.

## 로컬 DEMO (개발 확인용)

실제 샘플 러너가 없는 동안 화면을 확인하기 위한 **가상 러너 40명**입니다. 실제 DB에는 넣지 않습니다(가져오기 스크립트가 거부).

```bash
npm run items:demo -- --products "<Product DB>.xlsx"
npm run items:import -- --products "<Product DB>.xlsx" --runners data/demo/seed_runners.csv --runner-shoes data/demo/seed_runner_shoes.csv --json public/demo-data/items-demo.json
NEXT_PUBLIC_ITEMS_DEMO=1 npm run dev
```

- `NEXT_PUBLIC_ITEMS_DEMO=1`이고 **demo(로컬) 저장 모드일 때만** 사용됩니다. 서버 모드에서는 무시됩니다.
- 화면에 `DEMO` / `DEMO DATA` 표시가 붙습니다.
- 파일(`data/demo/`, `public/demo-data/`)은 Git에 올리지 않습니다. 지우거나 스위치를 끄면 실제 동작(데이터 없음 → 부족 상태)으로 돌아갑니다.
- 확인용 프로필 예: 173/70/270·5~10km(정상 28명) · 168/64/262(기본 4명 → 확대 28명) · 165/58/250(확대해도 4명)

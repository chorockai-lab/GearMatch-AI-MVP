# Supabase 운영 메모

## 연결 정보 (값은 문서·Git에 쓰지 않음)

| 항목 | 위치 |
|---|---|
| 프로젝트 | Seoul (`ap-northeast-2`) — 대시보드 Project Settings에서 확인 |
| URL · Publishable key | `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Git 제외) |
| 인증 | Anonymous Sign-Ins ON. 사용자 = 이 브라우저의 익명 세션. 다른 브라우저·데이터 삭제 시 복구 불가 |
| 저장 모드 | `NEXT_PUBLIC_DATA_MODE=real` + 위 두 값 → 서버 저장 / 그 외(`demo`) → 이 브라우저 임시 저장 |

`NEXT_PUBLIC_*` 값은 **빌드할 때 코드에 고정**됩니다. 모드를 바꾸면 `npm run build`(또는 `npm run dev` 재시작)를 다시 해야 합니다.
`.env.local`을 고치지 않고 한 번만 서버 모드로 띄우려면 실행 환경변수로 넘깁니다(셸 환경변수가 `.env.local`보다 우선).

```bash
NEXT_PUBLIC_DATA_MODE=real npm run build
```

## 마이그레이션 이력

| 파일 | 적용 방법 | 적용일 | 확인 |
|---|---|---|---|
| `supabase/migrations/20261013000000_init.sql` | 대시보드 **SQL Editor에 붙여넣어 수동 실행** | 2026-10-13 | `npm run check:supabase`가 4개 테이블·37개 열·`updated_at` 트리거를 확인. `npm run test:rls` 통과 |
| `supabase/migrations/20261014000000_items.sql` | SQL Editor 수동 실행 (STEP 4) | 적용 대기 | `check:supabase`·`test:rls`에 ITEMS 항목 포함 |
| `supabase/seed/items.generated.sql` (Git 제외) | SQL Editor — 상품 63개 upsert (`docs/ITEMS_DATA.md`) | 적용 대기 | 앱에 보이는 상품 수 `check:supabase` INFO |

**주의: 위 SQL을 다시 실행하지 않습니다.** (다시 실행해도 `if not exists` / `drop policy if exists`로 같은 상태가 되지만, 운영 DB에서 정책을 지웠다 다시 만드는 순간이 생깁니다.)

수동 실행은 Supabase CLI의 이력 테이블(`supabase_migrations.schema_migrations`)에 기록되지 않습니다.
나중에 CLI를 쓰기 시작하면 **처음 한 번** 아래 순서로 "이미 적용됨"을 기록한 뒤 사용합니다.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration repair --status applied 20261013000000
npx supabase migration repair --status applied 20261014000000
npx supabase migration list
```

`migration list`에서 Local과 Remote 양쪽에 `20261013000000`이 보이면 정상입니다. 그 뒤 새 변경은
`supabase/migrations/<타임스탬프>_<이름>.sql` 새 파일로 만들고 `npx supabase db push`로 적용합니다(기존 파일 수정 금지).
CLI를 쓰지 않고 계속 SQL Editor로 적용한다면, 이 표에 파일·날짜를 한 줄씩 추가합니다.

## 검증 명령

| 명령 | 내용 | 부작용 |
|---|---|---|
| `npm run check:supabase` | 인증 설정·익명 로그인·테이블/열·트리거 확인 | 익명 사용자 1명 생성(`user_metadata.qa = check_supabase`) |
| `npm run test:rls` | 익명 사용자 A/B로 조회·수정·삭제·사칭·로그아웃 접근 차단 확인 | 익명 사용자 2명 + `rls_test` 이벤트 1건 남음(이벤트는 지울 수 없음) |
| `npm run verify:sql` | 로컬 Postgres(PGlite)에서 마이그레이션·RLS·분석 쿼리 검증 | 없음 (네트워크 사용 안 함, CI에서도 실행) |

검증용 사용자·이벤트는 `docs/ANALYTICS_QUERIES.md`의 제외 조건으로 분석에서 빠집니다.

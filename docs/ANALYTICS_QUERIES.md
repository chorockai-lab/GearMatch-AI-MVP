# 분석 쿼리 (Supabase SQL Editor, 읽기 전용)

> 이벤트는 `public.events`에 쌓입니다(서버 모드에서만). 모든 쿼리는 `select`만 사용합니다.
> 시간대는 한국 시간(`Asia/Seoul`) 기준입니다. 기간은 각 쿼리의 `interval '7 days'`를 바꿔 조정합니다.
> **아직 실제 이용자 데이터가 없으면 결과는 0이거나 비어 있습니다. 예시 수치를 실제 결과처럼 쓰지 마세요.**

## 0. 제외 대상 (모든 쿼리 공통)

내부 테스트 데이터는 분석에서 뺍니다.

| 구분 | 표시 | 생기는 곳 |
|---|---|---|
| QA 브라우저 | 이벤트 `props.qa = true` | 아무 화면이나 `?qa=1`로 열면 그 브라우저의 이벤트에 붙음 (`?qa=0`으로 해제) |
| RLS 검증 사용자 | `auth.users.raw_user_meta_data.qa = 'rls_test'` · 이벤트 `rls_test` | `npm run test:rls` |
| 연결 점검 사용자 | `auth.users.raw_user_meta_data.qa = 'check_supabase'` | `npm run check:supabase` |
| QA 표시 누락 계정 (아래 목록) | 사용자 ID 직접 지정 | QA 도중 `?qa=1` 없이 처음 열린 세션 |

**QA 표시 누락 계정** — 2026-10-19 ITEMS 배포 검증 중, 저장 공간이 초기화된 테스트 브라우저가 `?qa=1` 없이 처음 열려 생긴 익명 계정입니다.
ID는 해당 브라우저의 저장된 세션에서 그대로 읽은 값(추정 아님)입니다. 두 계정 모두 이후 `?qa=1`로 다시 열어 `qa = true` 이벤트가 생겼으므로 위 첫 번째 규칙으로도 제외되지만, 확실히 하기 위해 아래 `with` 블록에 직접 넣었습니다.

| 사용자 ID | 생성 | 표시 없는 이벤트 |
|---|---|---|
| `4951accc-b218-4e71-a8a4-d1f4364bf006` | 2026-10-19 00:43 UTC | `app_open`·`test_start`·`test_question_view` 9건(테스트 1번 문항까지) |
| `43b0e116-f4de-4c36-90f6-62b623416fc6` | 2026-10-19 (헤드리스 브라우저) | 6건 |

아래 `with` 블록을 각 쿼리 맨 앞에 붙여 씁니다.

```sql
with excluded as (
  select distinct user_id from public.events where props->>'qa' = 'true' or name = 'rls_test'
  union
  select id from auth.users where raw_user_meta_data ? 'qa'
  union
  select unnest(array['4951accc-b218-4e71-a8a4-d1f4364bf006', '43b0e116-f4de-4c36-90f6-62b623416fc6']::uuid[]) -- QA 표시 누락 계정
),
ev as (
  select e.*, (e.created_at at time zone 'Asia/Seoul') as kst
  from public.events e
  where not exists (select 1 from excluded x where x.user_id = e.user_id)
)
```

## 1. 이벤트별 발생 횟수 vs 고유 사용자 수 (최근 7일)

같은 사람이 여러 번 본 화면은 횟수만 늘어납니다. 전환율에는 **고유 사용자 수**를 씁니다.

```sql
-- (0의 with 블록)
select name,
       count(*)                as event_count,
       count(distinct user_id) as unique_users
from ev
where created_at >= now() - interval '7 days'
group by name
order by unique_users desc, name;
```

## 2. 최근 7일 방문 사용자 수

```sql
-- (0의 with 블록)
select count(distinct user_id) as visitors_7d,
       count(*) filter (where name = 'app_open') as sessions_7d
from ev
where created_at >= now() - interval '7 days'
  and name in ('app_open', 'landing_view');
```

## 3. 단계별 고유 사용자 수 (최근 7일, 순서 무시)

```sql
-- (0의 with 블록)
select count(distinct user_id) filter (where name in ('app_open', 'landing_view')) as visited,
       count(distinct user_id) filter (where name = 'test_start')                  as test_started,
       count(distinct user_id) filter (where name = 'test_complete')               as test_completed,
       count(distinct user_id) filter (where name = 'reveal_view')                 as reveal_viewed,
       count(distinct user_id) filter (where name = 'onboarding_complete')         as onboarding_completed,
       count(distinct user_id) filter (where name = 'run_save_success')            as first_run_saved
from ev
where created_at >= now() - interval '7 days';
```

## 4. 순차 전환율 (같은 사용자의 이벤트 순서 반영)

각 사용자의 단계별 **첫 발생 시각**을 구하고, 앞 단계보다 늦게(또는 같은 시각에) 일어난 경우만 다음 단계로 셉니다.
기준 집단 = 최근 7일 안에 처음 방문한 사용자.

```sql
-- (0의 with 블록)
, firsts as (
  select user_id,
         min(created_at) filter (where name in ('app_open', 'landing_view')) as t_visit,
         min(created_at) filter (where name = 'test_start')                  as t_start,
         min(created_at) filter (where name = 'test_complete')               as t_complete,
         min(created_at) filter (where name = 'reveal_view')                 as t_reveal,
         min(created_at) filter (where name = 'onboarding_complete')         as t_onboarded,
         min(created_at) filter (where name = 'run_save_success')            as t_first_run
  from ev
  group by user_id
),
cohort as (
  select * from firsts where t_visit >= now() - interval '7 days'
),
steps as (
  select count(*)                                                        as s1_visit,
         count(*) filter (where t_start >= t_visit)                      as s2_test_start,
         count(*) filter (where t_complete >= t_start and t_start >= t_visit)     as s3_test_complete,
         count(*) filter (where t_reveal >= t_complete and t_complete >= t_start and t_start >= t_visit) as s4_reveal,
         count(*) filter (where t_onboarded >= t_reveal and t_reveal >= t_complete and t_complete >= t_start and t_start >= t_visit) as s5_onboarded,
         count(*) filter (where t_first_run >= t_onboarded and t_onboarded >= t_reveal and t_reveal >= t_complete and t_complete >= t_start and t_start >= t_visit) as s6_first_run
  from cohort
)
select *,
       round(100.0 * s2_test_start    / nullif(s1_visit, 0), 1)         as pct_visit_to_start,
       round(100.0 * s3_test_complete / nullif(s2_test_start, 0), 1)    as pct_start_to_complete,
       round(100.0 * s4_reveal        / nullif(s3_test_complete, 0), 1) as pct_complete_to_reveal,
       round(100.0 * s5_onboarded     / nullif(s4_reveal, 0), 1)        as pct_reveal_to_onboarded,
       round(100.0 * s6_first_run     / nullif(s5_onboarded, 0), 1)     as pct_onboarded_to_first_run,
       round(100.0 * s6_first_run     / nullif(s1_visit, 0), 1)         as pct_visit_to_first_run
from steps;
```

## 5. 테스트 문항별 이탈 (최근 7일)

`test_question_view.props.q` = 1~5. 답변 내용은 수집하지 않습니다.

```sql
-- (0의 with 블록)
select (props->>'q')::int          as question,
       count(distinct user_id)     as users_reached
from ev
where name = 'test_question_view'
  and created_at >= now() - interval '7 days'
group by 1
order by 1;
```

## 6. 일자별 방문자 (한국 날짜)

```sql
-- (0의 with 블록)
select kst::date as day, count(distinct user_id) as visitors
from ev
where name in ('app_open', 'landing_view')
  and created_at >= now() - interval '14 days'
group by 1
order by 1;
```

## 7. 재방문 사용자 (서로 다른 날 2번 이상 app_open)

```sql
-- (0의 with 블록)
select count(*) as returning_users
from (
  select user_id
  from ev
  where name = 'app_open'
  group by user_id
  having count(distinct kst::date) >= 2
) r;
```

## 8. ITEMS 이용 (최근 7일)

```sql
-- (0의 with 블록)
select count(distinct user_id) filter (where name = 'items_view')       as items_users,
       count(distinct user_id) filter (where name = 'shoe_detail_view') as detail_users,
       count(distinct user_id) filter (where name = 'shoe_save')        as save_users,
       count(*)                filter (where name = 'shoe_save')        as saves,
       count(*)                filter (where name = 'shoe_unsave')      as unsaves
from ev
where created_at >= now() - interval '7 days';
```

## 9. 온보딩 단계별 이탈 (테스트 기간)

Reveal 이후 단계를 순서대로 셉니다. `profile_runner`는 신체 정보 입력(완료) 또는 건너뛰기 중 먼저 일어난 것.
테스트 기간은 `period`의 두 값을 실제 시작·종료 시각으로 바꿉니다(예: `timestamptz '2026-10-20 00:00+09'`).

```sql
-- (0의 with 블록)
, period as (select now() - interval '14 days' as t0, now() as t1),
f as (
  select user_id,
         min(created_at) filter (where name = 'reveal_view')                                        as t_reveal,
         min(created_at) filter (where name = 'profile_habits_complete')                            as t_habits,
         min(created_at) filter (where name in ('profile_runner_complete', 'profile_runner_skip'))  as t_runner,
         bool_or(name = 'profile_runner_skip')                                                       as skipped_runner,
         min(created_at) filter (where name = 'onboarding_complete')                                as t_done
  from ev, period
  where created_at >= period.t0 and created_at < period.t1
  group by user_id
)
select count(*) filter (where t_reveal is not null)                                                     as s1_reveal,
       count(*) filter (where t_habits >= t_reveal)                                                     as s2_habits,
       count(*) filter (where t_runner >= t_habits and t_habits >= t_reveal)                            as s3_body_info_step,
       count(*) filter (where t_runner >= t_habits and t_habits >= t_reveal and skipped_runner)         as s3_skipped_body_info,
       count(*) filter (where t_done >= t_runner and t_runner >= t_habits and t_habits >= t_reveal)     as s4_onboarded
from f;
```

## 10. 카드 이미지 저장·공유 결과 (테스트 기간)

`card_image_create` = 이미지가 만들어짐. `card_share_result`의 `method · result`:
`share · shared`(iPhone 공유 시트 완료) · `share · cancelled`(닫음, 오류 아님) · `download · started`(다운로드 시작 — 갤러리 저장 확인은 아님) · `longpress · guide_shown`(인앱 미리보기 표시) · `* · failed`.

```sql
-- (0의 with 블록)
, period as (select now() - interval '14 days' as t0, now() as t1)
select name,
       props->>'card'   as card,
       props->>'method' as method,
       props->>'result' as result,
       count(*)                as events,
       count(distinct user_id) as users
from ev, period
where name in ('card_image_create', 'card_share_result')
  and created_at >= period.t0 and created_at < period.t1
group by 1, 2, 3, 4
order by 1, 2, 3, 4;
```

## 11. 첫 러닝 기록 저장률 (테스트 기간에 온보딩을 마친 사용자)

```sql
-- (0의 with 블록)
, period as (select now() - interval '14 days' as t0, now() as t1),
u as (
  select user_id,
         min(created_at) filter (where name = 'onboarding_complete') as t_on,
         min(created_at) filter (where name = 'run_save_success')    as t_run,
         count(*)        filter (where name = 'run_save_success')    as runs
  from ev
  group by user_id
)
select count(*)                                       as onboarded,
       count(*) filter (where t_run >= t_on)          as saved_first_run,
       round(100.0 * count(*) filter (where t_run >= t_on) / nullif(count(*), 0), 1) as pct_first_run,
       round(avg(runs) filter (where t_run >= t_on), 1) as avg_runs_per_saver
from u, period
where t_on >= period.t0 and t_on < period.t1;
```

## 참고

- 익명 사용자 기준입니다. 같은 사람이 다른 브라우저·시크릿 창을 쓰면 다른 사용자로 셉니다.
- `run_save_success`는 저장 성공 시에만 기록됩니다. 기록을 나중에 지워도 이벤트는 남습니다(append-only).
- 같은 이벤트가 PostHog에도 전송됩니다(`docs/POSTHOG.md`). PostHog 차트와 이 SQL 결과를 교차 확인할 수 있습니다(PostHog는 `NEXT_PUBLIC_POSTHOG_ENABLED` 범위의 사용자만).
- 이벤트 이름 목록: `src/lib/events/track.ts`의 `EVENT_NAMES`.
- 이 쿼리들은 로컬 Postgres(PGlite)에 같은 마이그레이션과 표본 이벤트를 넣어 실행 검증했습니다(`npm run verify:sql` · `scripts/verify-sql.mjs`, CI에서도 실행). 실제 수치는 아직 수집 전입니다.

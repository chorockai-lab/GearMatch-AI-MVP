-- Privacy P-2: a signed-in anonymous user deletes their own account and everything linked to it.
--
-- Security design (docs/PRIVACY_DELETE.md):
--   • no parameters — the account is always the caller's own JWT subject (auth.uid()); another user's id cannot be passed
--   • anonymous accounts only (auth.users.is_anonymous) — a future non-anonymous account is refused
--   • SECURITY DEFINER is needed only to delete the auth.users row; search_path is pinned to '' and every name is qualified
--   • EXECUTE: authenticated only. Supabase grants EXECUTE on new public functions to anon by default → revoked explicitly
--   • the caller's rows are deleted explicitly (counts returned) and again by the existing ON DELETE CASCADE from auth.users
--   • no service role key is used anywhere
-- Applying this file adds one function; it does not read, change or delete any existing row.

create or replace function public.delete_my_data()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n_identity integer;
  n_profile integer;
  n_runs integer;
  n_saved integer;
  n_events integer;
  n_account integer;
begin
  if uid is null then
    raise exception 'delete_my_data: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.is_anonymous is true) then
    raise exception 'delete_my_data: only an anonymous account can be deleted here' using errcode = '42501';
  end if;

  delete from public.saved_products where user_id = uid;
  get diagnostics n_saved = row_count;
  delete from public.runs where user_id = uid;
  get diagnostics n_runs = row_count;
  delete from public.runner_profiles where user_id = uid;
  get diagnostics n_profile = row_count;
  delete from public.identity_results where user_id = uid;
  get diagnostics n_identity = row_count;
  delete from public.events where user_id = uid;
  get diagnostics n_events = row_count;
  delete from auth.users where id = uid;  -- sessions / refresh tokens / identities cascade inside the auth schema
  get diagnostics n_account = row_count;

  return jsonb_build_object(
    'identity_results', n_identity,
    'runner_profiles', n_profile,
    'runs', n_runs,
    'saved_products', n_saved,
    'events', n_events,
    'account', n_account
  );
end;
$$;

revoke all on function public.delete_my_data() from public;
revoke all on function public.delete_my_data() from anon;
grant execute on function public.delete_my_data() to authenticated;

comment on function public.delete_my_data() is
  'Privacy P-2: deletes the calling anonymous user (auth.uid()) and all of their rows. No parameters; anon cannot execute.';

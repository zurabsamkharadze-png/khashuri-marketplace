-- 003: Restrict chairman access to profiles that actually submitted a request
-- or have a confirmed membership. This avoids showing unrelated signups.
begin;
drop policy if exists corp_profiles_read on public.corp_profiles;
create policy corp_profiles_read on public.corp_profiles for select to authenticated
using (
  id = (select auth.uid())
  or (
    (select public.corp_is_chairman())
    and (
      exists (select 1 from public.corp_requests rq where rq.applicant_id = id)
      or exists (select 1 from public.corp_members mb where mb.user_id = id)
    )
  )
);
commit;

-- 004: Require a verified email address before a resident can submit an apartment request.
-- Applies even if email confirmation is accidentally disabled for a sign-up flow.
begin;
create or replace function public.corp_email_verified()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  )
$$;

revoke all on function public.corp_email_verified() from public, anon;
grant execute on function public.corp_email_verified() to authenticated;

drop policy if exists corp_requests_insert on public.corp_requests;
create policy corp_requests_insert on public.corp_requests
for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and (select public.corp_email_verified())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and review_note = ''
  and not exists (
    select 1 from public.corp_members m
    where m.user_id = (select auth.uid())
  )
);
commit;
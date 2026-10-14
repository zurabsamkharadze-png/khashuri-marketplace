-- 005: Chairman may revoke access to a single apartment, with an audit trail.
-- Do not delete auth accounts, profiles, history, or other apartment memberships.
begin;
create table if not exists public.corp_membership_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  member_id uuid not null references auth.users(id),
  apartment smallint not null check (apartment between 1 and 60),
  action text not null check (action = 'revoke'),
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
alter table public.corp_membership_audit enable row level security;
drop policy if exists corp_membership_audit_chair_read on public.corp_membership_audit;
create policy corp_membership_audit_chair_read
on public.corp_membership_audit for select to authenticated
using ((select public.corp_is_chairman()));
revoke all on public.corp_membership_audit from anon, authenticated;
grant select on public.corp_membership_audit to authenticated;

create or replace function public.corp_revoke_member(
 p_user_id uuid, p_apartment smallint, p_reason text default ''
) returns void language plpgsql security definer set search_path = ''
as $$
begin
 if not public.corp_is_chairman() then raise exception 'Permission denied'; end if;
 if char_length(coalesce(p_reason,'')) > 500 then raise exception 'Reason too long'; end if;
 delete from public.corp_members
   where user_id = p_user_id and apartment = p_apartment;
 if not found then raise exception 'Approved membership not found'; end if;
 insert into public.corp_membership_audit(actor_id,member_id,apartment,action,reason)
 values((select auth.uid()),p_user_id,p_apartment,'revoke',coalesce(p_reason,''));
end; $$;
revoke all on function public.corp_revoke_member(uuid,smallint,text) from public,anon;
grant execute on function public.corp_revoke_member(uuid,smallint,text) to authenticated;
commit;
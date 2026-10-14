-- Run after 001_init.sql on the isolated dedicated database.
-- Chairman may correct a VERIFIED member's personal contact details.
begin;
create table if not exists public.corp_profile_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  target_id uuid not null references auth.users(id),
  event text not null check (event in ('edit')),
  created_at timestamptz not null default now()
);
alter table public.corp_profile_audit enable row level security;
drop policy if exists corp_profile_audit_chair on public.corp_profile_audit;
create policy corp_profile_audit_chair on public.corp_profile_audit for select to authenticated
using ((select public.corp_is_chairman()));
revoke all on public.corp_profile_audit from anon, authenticated;
grant select on public.corp_profile_audit to authenticated;

create or replace function public.corp_edit_resident(
 p_user_id uuid, p_first_name text, p_last_name text, p_phone text
) returns void language plpgsql security definer set search_path = ''
as $$
begin
 if not public.corp_is_chairman() then raise exception 'Permission denied'; end if;
 if not exists (select 1 from public.corp_members where user_id = p_user_id)
    then raise exception 'This account has no approved membership'; end if;
 if char_length(btrim(coalesce(p_first_name,''))) not between 2 and 70
    or char_length(btrim(coalesce(p_last_name,''))) not between 2 and 70
    or btrim(coalesce(p_phone,'')) !~ '^[+]?[0-9 ()-]{7,25}$'
    then raise exception 'Invalid profile fields'; end if;
 update public.corp_profiles set
   first_name = btrim(p_first_name),
   last_name = btrim(p_last_name),
   phone = btrim(p_phone)
 where id = p_user_id;
 if not found then raise exception 'Account not found'; end if;
 insert into public.corp_profile_audit(actor_id,target_id,event)
 values((select auth.uid()),p_user_id,'edit');
end; $$;

revoke all on function public.corp_edit_resident(uuid,text,text,text) from public,anon;
grant execute on function public.corp_edit_resident(uuid,text,text,text) to authenticated;
commit;
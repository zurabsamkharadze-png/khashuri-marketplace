-- 006: Chairman-only apartment layout corrections with durable audit history.
-- All 60 apartments exist, but their locations start unassigned.
begin;
create table if not exists public.corp_unit_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  apartment smallint not null check(apartment between 1 and 60),
  old_entrance smallint,
  old_floor smallint,
  new_entrance smallint not null check(new_entrance between 1 and 3),
  new_floor smallint not null check(new_floor between 2 and 8),
  created_at timestamptz not null default now()
);
alter table public.corp_unit_audit enable row level security;
drop policy if exists corp_unit_audit_chair_read on public.corp_unit_audit;
create policy corp_unit_audit_chair_read on public.corp_unit_audit
for select to authenticated using ((select public.corp_is_chairman()));
revoke all on public.corp_unit_audit from anon, authenticated;
grant select on public.corp_unit_audit to authenticated;

create or replace function public.corp_set_unit_location(
  p_apartment smallint, p_entrance smallint, p_floor smallint
) returns void language plpgsql security definer set search_path = ''
as $$
declare old_loc public.corp_units%rowtype;
begin
  if not public.corp_is_chairman() then raise exception 'Permission denied'; end if;
  if p_apartment is null or p_apartment < 1 or p_apartment > 60
     or p_entrance is null or p_entrance < 1 or p_entrance > 3
     or p_floor is null or p_floor < 2 or p_floor > 8
  then raise exception 'Invalid apartment, entrance or floor'; end if;
  select * into old_loc from public.corp_units
  where apartment = p_apartment for update;
  if not found then raise exception 'Apartment not found'; end if;
  if old_loc.entrance is not distinct from p_entrance
     and old_loc.floor is not distinct from p_floor
  then return; end if;
  update public.corp_units set entrance = p_entrance, floor = p_floor
  where apartment = p_apartment;
  insert into public.corp_unit_audit(
    actor_id,apartment,old_entrance,old_floor,new_entrance,new_floor
  ) values (
    (select auth.uid()),p_apartment,old_loc.entrance,old_loc.floor,p_entrance,p_floor
  );
end; $$;

revoke all on function public.corp_set_unit_location(smallint,smallint,smallint) from public,anon;
grant execute on function public.corp_set_unit_location(smallint,smallint,smallint) to authenticated;
commit;
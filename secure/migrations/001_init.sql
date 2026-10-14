-- ჩვენი კორპუსი / Chveni Korpusi
-- Deploy only to a NEW, dedicated Supabase project, never into existing business databases.
-- Registration: email/password (Supabase Auth); chairman approval required.
begin;
create extension if not exists pgcrypto;

do $$ begin
  create type public.corp_role as enum ('chairman','resident');
exception when duplicate_object then null; end $$;

create table if not exists public.corp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 70),
  last_name text not null check (char_length(last_name) between 2 and 70),
  phone text not null check (phone ~ '^[+]?[0-9 ()-]{7,25}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.corp_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.corp_role not null default 'resident'
);

create table if not exists public.corp_units (
  apartment smallint primary key check (apartment between 1 and 60),
  entrance smallint check (entrance between 1 and 3),
  floor smallint check (floor between 2 and 8),
  check ((entrance is null and floor is null) or (entrance is not null and floor is not null))
);

insert into public.corp_units(apartment)
select g from generate_series(1,60) as g
on conflict (apartment) do nothing;

create table if not exists public.corp_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.corp_profiles(id) on delete cascade,
  apartment smallint not null references public.corp_units(apartment),
  entrance smallint not null check (entrance between 1 and 3),
  floor smallint not null check (floor between 2 and 8),
  relation text not null check (relation in ('owner','resident')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '' check (char_length(review_note) <= 500),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists corp_one_pending_per_user
on public.corp_requests(applicant_id) where status = 'pending';

create table if not exists public.corp_members (
  user_id uuid not null references public.corp_profiles(id) on delete cascade,
  apartment smallint not null references public.corp_units(apartment),
  relation text not null check (relation in ('owner','resident')),
  approved_at timestamptz not null default now(),
  primary key (user_id,apartment)
);

create table if not exists public.corp_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('approve','reject')),
  request_id uuid not null references public.corp_requests(id),
  created_at timestamptz not null default now()
);

create or replace function public.corp_is_chairman()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
 select 1 from public.corp_roles
 where user_id = (select auth.uid()) and role = 'chairman'::public.corp_role
); $$;

-- Profiles are created by the authenticated signup event.
create or replace function public.corp_handle_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  f text := btrim(coalesce(new.raw_user_meta_data ->> 'first_name',''));
  l text := btrim(coalesce(new.raw_user_meta_data ->> 'last_name',''));
  p text := btrim(coalesce(new.raw_user_meta_data ->> 'phone',''));
begin
  -- Do not allow signup metadata to assign any privileged role.
  if char_length(f) not between 2 and 70 or char_length(l) not between 2 and 70
     or p !~ '^[+]?[0-9 ()-]{7,25}$' then
    raise exception 'Invalid registration details';
  end if;
  insert into public.corp_profiles(id,first_name,last_name,phone)
  values(new.id,f,l,p);
  insert into public.corp_roles(user_id,role)
  values(new.id,'resident') on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists corp_new_user on auth.users;
create trigger corp_new_user after insert on auth.users
for each row execute function public.corp_handle_signup();

alter table public.corp_profiles enable row level security;
alter table public.corp_roles enable row level security;
alter table public.corp_units enable row level security;
alter table public.corp_requests enable row level security;
alter table public.corp_members enable row level security;
alter table public.corp_audit enable row level security;

drop policy if exists corp_profiles_read on public.corp_profiles;
create policy corp_profiles_read on public.corp_profiles for select to authenticated
using (id = (select auth.uid()) or (select public.corp_is_chairman()));

drop policy if exists corp_roles_read on public.corp_roles;
create policy corp_roles_read on public.corp_roles for select to authenticated
using (user_id = (select auth.uid()) or (select public.corp_is_chairman()));

drop policy if exists corp_units_read on public.corp_units;
create policy corp_units_read on public.corp_units for select to authenticated
using (true);

drop policy if exists corp_requests_read on public.corp_requests;
create policy corp_requests_read on public.corp_requests for select to authenticated
using (applicant_id = (select auth.uid()) or (select public.corp_is_chairman()));

drop policy if exists corp_requests_insert on public.corp_requests;
create policy corp_requests_insert on public.corp_requests for insert to authenticated
with check (
 applicant_id = (select auth.uid()) and status = 'pending'
 and reviewed_by is null and reviewed_at is null and review_note = ''
 and not exists (
   select 1 from public.corp_members m where m.user_id = (select auth.uid())
 )
);

drop policy if exists corp_members_read on public.corp_members;
create policy corp_members_read on public.corp_members for select to authenticated
using (user_id = (select auth.uid()) or (select public.corp_is_chairman()));

drop policy if exists corp_audit_read on public.corp_audit;
create policy corp_audit_read on public.corp_audit for select to authenticated
using ((select public.corp_is_chairman()));

-- No client-side insert/update/delete policy for roles, members, audit or profiles.
-- Only reviewed requests may create actual membership.
create or replace function public.corp_review_request(p_request_id uuid, p_approve boolean, p_note text default '')
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.corp_requests%rowtype; u public.corp_units%rowtype;
begin
 if not public.corp_is_chairman() then raise exception 'Permission denied'; end if;
 if char_length(coalesce(p_note,'')) > 500 then raise exception 'Review note too long'; end if;
 select * into r from public.corp_requests where id=p_request_id for update;
 if not found or r.status <> 'pending' then raise exception 'Request not pending'; end if;
 if p_approve then
   select * into u from public.corp_units where apartment = r.apartment for update;
   if not found then raise exception 'Apartment not found'; end if;
   if (u.entrance is not null and u.entrance <> r.entrance)
      or (u.floor is not null and u.floor <> r.floor) then
     raise exception 'Apartment does not match entrance/floor';
   end if;
   update public.corp_units
     set entrance = r.entrance, floor = r.floor
     where apartment = r.apartment and entrance is null;
   insert into public.corp_members (user_id,apartment,relation)
     values (r.applicant_id,r.apartment,r.relation)
     on conflict (user_id,apartment) do nothing;
 end if;
 update public.corp_requests
   set status = case when p_approve then 'approved' else 'rejected' end,
       reviewed_by = (select auth.uid()), reviewed_at = now(),
       review_note = coalesce(p_note,'')
   where id = p_request_id;
 insert into public.corp_audit(actor_id,action,request_id)
 values((select auth.uid()),case when p_approve then 'approve' else 'reject' end,p_request_id);
end; $$;

-- Only authenticated members can call this function.
revoke all on function public.corp_review_request(uuid,boolean,text) from public,anon;
grant execute on function public.corp_review_request(uuid,boolean,text) to authenticated;
revoke all on function public.corp_is_chairman() from public,anon;
grant execute on function public.corp_is_chairman() to authenticated;

-- Privilege assignment is deliberately manual by a trusted operator after identity verification.
-- For example, only in the SQL editor: update public.corp_roles
-- set role='chairman' where user_id='<verified UUID>';
commit;
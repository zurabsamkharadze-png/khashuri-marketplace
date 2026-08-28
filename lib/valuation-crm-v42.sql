-- V42 valuation leads CRM
-- Apply once in Supabase. Safe multi-user ownership via a public referral token.

create extension if not exists pgcrypto;

create table if not exists public.valuation_crm_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table if not exists public.valuation_leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','contacted','working','closed')),
  client_name text not null,
  phone text not null,
  contact_method text not null default 'phone' check (contact_method in ('phone','whatsapp','telegram','any')),
  comment text,
  cadastral_code text,
  city text,
  address text,
  estimated_value numeric,
  owner_price numeric,
  language text not null default 'ru' check (language in ('ru','ka')),
  valuation_local_id text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists valuation_leads_owner_created_idx
  on public.valuation_leads(owner_user_id, created_at desc);
create index if not exists valuation_leads_owner_status_idx
  on public.valuation_leads(owner_user_id, status, created_at desc);

alter table public.valuation_crm_profiles enable row level security;
alter table public.valuation_leads enable row level security;

revoke all on public.valuation_crm_profiles from anon;
revoke all on public.valuation_leads from anon;
grant select, insert, update on public.valuation_crm_profiles to authenticated;
grant select, update, delete on public.valuation_leads to authenticated;

create policy "crm profile read own" on public.valuation_crm_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "crm profile insert own" on public.valuation_crm_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "crm profile update own" on public.valuation_crm_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "crm leads read own" on public.valuation_leads
  for select to authenticated using (owner_user_id = auth.uid());
create policy "crm leads update own" on public.valuation_leads
  for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "crm leads delete own" on public.valuation_leads
  for delete to authenticated using (owner_user_id = auth.uid());

create or replace function public.get_or_create_valuation_public_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tok uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  insert into public.valuation_crm_profiles(user_id) values(uid)
  on conflict(user_id) do nothing;
  select public_token into tok from public.valuation_crm_profiles where user_id=uid;
  return tok;
end;
$$;

revoke all on function public.get_or_create_valuation_public_token() from public;
grant execute on function public.get_or_create_valuation_public_token() to authenticated;

create or replace function public.submit_valuation_lead(p_token uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  lead_id uuid;
  nm text := left(trim(coalesce(p_payload->>'client_name','')),80);
  ph text := left(trim(coalesce(p_payload->>'phone','')),40);
  method text := lower(coalesce(p_payload->>'contact_method','phone'));
  lang text := lower(coalesce(p_payload->>'language','ru'));
begin
  select user_id into owner_id from public.valuation_crm_profiles where public_token=p_token;
  if owner_id is null then raise exception 'invalid_referral_token'; end if;
  if length(nm) < 2 then raise exception 'invalid_client_name'; end if;
  if length(ph) < 5 then raise exception 'invalid_phone'; end if;
  if method not in ('phone','whatsapp','telegram','any') then method := 'phone'; end if;
  if lang not in ('ru','ka') then lang := 'ru'; end if;

  select id into lead_id
  from public.valuation_leads
  where owner_user_id=owner_id and phone=ph and created_at > now()-interval '2 minutes'
  order by created_at desc limit 1;
  if lead_id is not null then return lead_id; end if;

  insert into public.valuation_leads(
    owner_user_id,client_name,phone,contact_method,comment,cadastral_code,city,address,
    estimated_value,owner_price,language,valuation_local_id,payload
  ) values (
    owner_id,nm,ph,method,left(coalesce(p_payload->>'comment',''),1000),
    left(coalesce(p_payload->>'cadastral_code',''),64),left(coalesce(p_payload->>'city',''),100),
    left(coalesce(p_payload->>'address',''),300),
    nullif(p_payload->>'estimated_value','')::numeric,
    nullif(p_payload->>'owner_price','')::numeric,
    lang,left(coalesce(p_payload->>'valuation_local_id',''),120),
    jsonb_strip_nulls(p_payload - array['client_name','phone','comment']::text[])
  ) returning id into lead_id;
  return lead_id;
end;
$$;

revoke all on function public.submit_valuation_lead(uuid,jsonb) from public;
grant execute on function public.submit_valuation_lead(uuid,jsonb) to anon, authenticated;

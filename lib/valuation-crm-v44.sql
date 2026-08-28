alter table public.valuation_leads
  add column if not exists outcome text not null default 'open',
  add column if not exists deal_value numeric,
  add column if not exists closed_reason text;

alter table public.valuation_leads
  drop constraint if exists valuation_leads_outcome_check;
alter table public.valuation_leads
  add constraint valuation_leads_outcome_check check (outcome in ('open','won','lost'));

alter table public.valuation_leads
  drop constraint if exists valuation_leads_deal_value_check;
alter table public.valuation_leads
  add constraint valuation_leads_deal_value_check check (deal_value is null or deal_value >= 0);

create table if not exists public.valuation_referral_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  event_key text,
  valuation_local_id text,
  city text,
  estimated_value numeric,
  payload jsonb not null default '{}'::jsonb,
  constraint valuation_referral_events_type_check check (event_type in ('result_view'))
);

create unique index if not exists valuation_referral_events_owner_event_key_uidx
  on public.valuation_referral_events(owner_user_id,event_type,event_key)
  where event_key is not null;
create index if not exists valuation_referral_events_owner_created_idx
  on public.valuation_referral_events(owner_user_id,created_at desc);

alter table public.valuation_referral_events enable row level security;
revoke all on public.valuation_referral_events from anon;
revoke all on public.valuation_referral_events from authenticated;
grant select on public.valuation_referral_events to authenticated;

drop policy if exists "valuation referral events read own" on public.valuation_referral_events;
create policy "valuation referral events read own"
  on public.valuation_referral_events
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

create or replace function public.track_valuation_referral_event(
  p_token uuid,
  p_event_type text,
  p_event_key text,
  p_payload jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_type text := lower(trim(coalesce(p_event_type,'')));
  v_key text := nullif(left(trim(coalesce(p_event_key,'')),180),'');
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
begin
  if v_type <> 'result_view' then
    raise exception 'invalid_event_type';
  end if;

  select p.user_id into v_owner
  from public.valuation_crm_profiles p
  where p.public_token = p_token;

  if v_owner is null then
    raise exception 'invalid_referral_token';
  end if;

  insert into public.valuation_referral_events(
    owner_user_id,event_type,event_key,valuation_local_id,city,estimated_value,payload
  ) values (
    v_owner,
    v_type,
    v_key,
    nullif(left(trim(coalesce(v_payload->>'valuation_local_id','')),180),''),
    nullif(left(trim(coalesce(v_payload->>'city','')),120),''),
    case when coalesce(v_payload->>'estimated_value','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_payload->>'estimated_value')::numeric else null end,
    v_payload
  )
  on conflict (owner_user_id,event_type,event_key) where event_key is not null do nothing;

  return true;
end;
$$;

revoke all on function public.track_valuation_referral_event(uuid,text,text,jsonb) from public;
grant execute on function public.track_valuation_referral_event(uuid,text,text,jsonb) to anon, authenticated;

create index if not exists valuation_leads_owner_outcome_idx
  on public.valuation_leads(owner_user_id,outcome,created_at desc);
create index if not exists valuation_leads_owner_followup_idx
  on public.valuation_leads(owner_user_id,follow_up_at)
  where follow_up_at is not null and status <> 'closed';

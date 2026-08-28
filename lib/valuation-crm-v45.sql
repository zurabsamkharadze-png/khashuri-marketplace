create table if not exists public.valuation_crm_activity (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.valuation_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint valuation_crm_activity_event_check check (event_type in (
    'lead_created','status_changed','priority_changed','manager_note_updated',
    'follow_up_changed','outcome_changed','deal_value_changed','closed_reason_changed',
    'contact_call','contact_whatsapp','contact_other'
  ))
);

create index if not exists valuation_crm_activity_owner_created_idx
  on public.valuation_crm_activity(owner_user_id, created_at desc);
create index if not exists valuation_crm_activity_lead_created_idx
  on public.valuation_crm_activity(lead_id, created_at desc);
create unique index if not exists valuation_crm_activity_lead_created_once_uidx
  on public.valuation_crm_activity(lead_id, event_type)
  where event_type = 'lead_created';

alter table public.valuation_crm_activity enable row level security;
revoke all on public.valuation_crm_activity from anon;
revoke all on public.valuation_crm_activity from authenticated;
grant select, insert on public.valuation_crm_activity to authenticated;

drop policy if exists "valuation crm activity read own" on public.valuation_crm_activity;
create policy "valuation crm activity read own"
  on public.valuation_crm_activity
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "valuation crm activity insert own" on public.valuation_crm_activity;
create policy "valuation crm activity insert own"
  on public.valuation_crm_activity
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.valuation_leads l
      where l.id = lead_id and l.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.valuation_crm_log_changes_v45()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.valuation_crm_activity(owner_user_id, lead_id, created_at, event_type, new_value)
    values (new.owner_user_id, new.id, coalesce(new.created_at, now()), 'lead_created', jsonb_build_object('status',new.status))
    on conflict (lead_id, event_type) where event_type = 'lead_created' do nothing;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,old_value,new_value)
    values(new.owner_user_id,new.id,'status_changed',jsonb_build_object('status',old.status),jsonb_build_object('status',new.status));
  end if;
  if new.priority is distinct from old.priority then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,old_value,new_value)
    values(new.owner_user_id,new.id,'priority_changed',jsonb_build_object('priority',old.priority),jsonb_build_object('priority',new.priority));
  end if;
  if new.manager_note is distinct from old.manager_note then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,metadata)
    values(new.owner_user_id,new.id,'manager_note_updated',jsonb_build_object('has_note',new.manager_note is not null));
  end if;
  if new.follow_up_at is distinct from old.follow_up_at then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,old_value,new_value)
    values(new.owner_user_id,new.id,'follow_up_changed',
      case when old.follow_up_at is null then null else jsonb_build_object('follow_up_at',old.follow_up_at) end,
      case when new.follow_up_at is null then null else jsonb_build_object('follow_up_at',new.follow_up_at) end);
  end if;
  if new.outcome is distinct from old.outcome then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,old_value,new_value)
    values(new.owner_user_id,new.id,'outcome_changed',jsonb_build_object('outcome',old.outcome),jsonb_build_object('outcome',new.outcome));
  end if;
  if new.deal_value is distinct from old.deal_value then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,old_value,new_value)
    values(new.owner_user_id,new.id,'deal_value_changed',
      case when old.deal_value is null then null else jsonb_build_object('deal_value',old.deal_value) end,
      case when new.deal_value is null then null else jsonb_build_object('deal_value',new.deal_value) end);
  end if;
  if new.closed_reason is distinct from old.closed_reason then
    insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,metadata)
    values(new.owner_user_id,new.id,'closed_reason_changed',jsonb_build_object('has_reason',new.closed_reason is not null));
  end if;
  return new;
end;
$$;

revoke execute on function public.valuation_crm_log_changes_v45() from public, anon, authenticated;

drop trigger if exists valuation_crm_activity_v45 on public.valuation_leads;
create trigger valuation_crm_activity_v45
  after insert or update of status,priority,manager_note,follow_up_at,outcome,deal_value,closed_reason
  on public.valuation_leads
  for each row execute function public.valuation_crm_log_changes_v45();

insert into public.valuation_crm_activity(owner_user_id,lead_id,created_at,event_type,new_value)
select l.owner_user_id,l.id,l.created_at,'lead_created',jsonb_build_object('status',l.status)
from public.valuation_leads l
on conflict (lead_id,event_type) where event_type='lead_created' do nothing;

create or replace function public.record_valuation_crm_contact_v45(
  p_lead_id uuid,
  p_channel text
) returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_channel text := lower(trim(coalesce(p_channel,'')));
  v_event text;
  v_row public.valuation_leads%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if v_channel not in ('call','whatsapp','other') then raise exception 'invalid_channel'; end if;

  select * into v_row
  from public.valuation_leads
  where id=p_lead_id and owner_user_id=v_uid;
  if not found then raise exception 'lead_not_found'; end if;

  update public.valuation_leads
  set last_contact_at=now(),
      status=case when status='new' then 'contacted' else status end,
      updated_at=now()
  where id=p_lead_id and owner_user_id=v_uid;

  v_event := case v_channel when 'call' then 'contact_call' when 'whatsapp' then 'contact_whatsapp' else 'contact_other' end;
  insert into public.valuation_crm_activity(owner_user_id,lead_id,event_type,metadata)
  values(v_uid,p_lead_id,v_event,jsonb_build_object('channel',v_channel));
  return true;
end;
$$;

revoke all on function public.record_valuation_crm_contact_v45(uuid,text) from public, anon;
grant execute on function public.record_valuation_crm_contact_v45(uuid,text) to authenticated;
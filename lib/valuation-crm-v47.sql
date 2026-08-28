-- Valuation CRM V47
-- Integrates CRM notifications with the existing Khashuri Marketplace Web Push V12 pipeline.

create table if not exists public.valuation_crm_followup_notified_v47 (
  lead_id uuid not null references public.valuation_leads(id) on delete cascade,
  follow_up_at timestamptz not null,
  notification_id uuid references public.user_notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (lead_id, follow_up_at)
);

alter table public.valuation_crm_followup_notified_v47 enable row level security;
revoke all on public.valuation_crm_followup_notified_v47 from public, anon, authenticated;

create or replace function public.valuation_crm_new_lead_notify_v47()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nid uuid;
  v_body text;
begin
  v_body := concat_ws(
    ' · ',
    nullif(new.client_name, ''),
    nullif(new.city, ''),
    case when new.estimated_value is not null
      then '$' || trim(to_char(new.estimated_value, 'FM999G999G999G990'))
      else null
    end
  );

  insert into public.user_notifications(
    user_id, notification_type, title, body, entity_type, entity_id, metadata
  ) values (
    new.owner_user_id,
    'valuation_crm_lead',
    '🆕 Новая заявка на оценку',
    v_body,
    'valuation_lead',
    new.id,
    jsonb_build_object(
      'source', 'valuation_crm_v47',
      'kind', 'new_lead',
      'url', '/valuation/crm?lead=' || new.id
    )
  ) returning id into v_nid;

  return new;
end;
$$;

drop trigger if exists valuation_crm_new_lead_notify_v47 on public.valuation_leads;
create trigger valuation_crm_new_lead_notify_v47
after insert on public.valuation_leads
for each row execute function public.valuation_crm_new_lead_notify_v47();

create or replace function public.valuation_crm_followup_notify_tick_v47()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with due as (
    select l.id, l.owner_user_id, l.client_name, l.city,
           l.estimated_value, l.follow_up_at
    from public.valuation_leads l
    where l.follow_up_at is not null
      and l.follow_up_at <= now()
      and l.follow_up_at >= now() - interval '30 days'
      and l.status <> 'closed'
      and coalesce(l.outcome, 'open') = 'open'
  ), marked as (
    insert into public.valuation_crm_followup_notified_v47(lead_id, follow_up_at)
    select d.id, d.follow_up_at from due d
    on conflict (lead_id, follow_up_at) do nothing
    returning lead_id, follow_up_at
  ), ins as (
    insert into public.user_notifications(
      user_id, notification_type, title, body,
      entity_type, entity_id, metadata
    )
    select
      d.owner_user_id,
      'valuation_crm_followup',
      '⏰ Пора связаться с клиентом',
      concat_ws(
        ' · ',
        nullif(d.client_name, ''),
        nullif(d.city, ''),
        case when d.estimated_value is not null
          then '$' || trim(to_char(d.estimated_value, 'FM999G999G999G990'))
          else null
        end
      ),
      'valuation_lead',
      d.id,
      jsonb_build_object(
        'source', 'valuation_crm_v47',
        'kind', 'follow_up_due',
        'url', '/valuation/crm?lead=' || d.id,
        'follow_up_at', d.follow_up_at
      )
    from due d
    join marked m on m.lead_id = d.id and m.follow_up_at = d.follow_up_at
    returning id, entity_id
  )
  update public.valuation_crm_followup_notified_v47 f
  set notification_id = i.id
  from ins i
  where f.lead_id = i.entity_id and f.notification_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.valuation_crm_followup_notify_tick_v47()
  from public, anon, authenticated;
grant execute on function public.valuation_crm_followup_notify_tick_v47()
  to service_role;

create or replace function public.register_valuation_crm_push_device_v47(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if length(coalesce(p_endpoint, '')) < 20 or length(p_endpoint) > 4096 then raise exception 'invalid_endpoint'; end if;
  if length(coalesce(p_p256dh, '')) < 20 or length(p_p256dh) > 512 then raise exception 'invalid_p256dh'; end if;
  if length(coalesce(p_auth, '')) < 8 or length(p_auth) > 256 then raise exception 'invalid_auth'; end if;

  insert into public.push_subscriptions(
    user_id, endpoint, p256dh, auth, user_agent,
    enabled, updated_at, last_seen_at
  ) values (
    v_uid, trim(p_endpoint), trim(p_p256dh), trim(p_auth),
    left(p_user_agent, 500), true, now(), now()
  )
  on conflict (user_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    enabled = true,
    updated_at = now(),
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_valuation_crm_push_device_v47(text,text,text,text)
  from public, anon;
grant execute on function public.register_valuation_crm_push_device_v47(text,text,text,text)
  to authenticated;

create or replace function public.disable_valuation_crm_push_device_v47(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  update public.push_subscriptions
  set enabled = false, updated_at = now()
  where user_id = auth.uid() and endpoint = p_endpoint;
  return found;
end;
$$;

revoke all on function public.disable_valuation_crm_push_device_v47(text)
  from public, anon;
grant execute on function public.disable_valuation_crm_push_device_v47(text)
  to authenticated;

create or replace function public.valuation_crm_push_state_v47()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'active_devices', count(*) filter (where enabled),
    'last_seen_at', max(last_seen_at),
    'last_push_at', max(updated_at) filter (where enabled)
  )
  from public.push_subscriptions
  where user_id = auth.uid()
$$;

revoke all on function public.valuation_crm_push_state_v47()
  from public, anon;
grant execute on function public.valuation_crm_push_state_v47()
  to authenticated;

create or replace function public.queue_valuation_crm_test_notification_v47()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  insert into public.user_notifications(
    user_id, notification_type, title, body, entity_type, metadata
  ) values (
    v_uid,
    'valuation_crm_test',
    '🔔 CRM Push работает',
    'Тестовое уведомление V47 успешно поставлено в очередь.',
    'valuation_crm',
    jsonb_build_object(
      'source', 'valuation_crm_v47',
      'kind', 'test',
      'url', '/valuation/crm'
    )
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.queue_valuation_crm_test_notification_v47()
  from public, anon;
grant execute on function public.queue_valuation_crm_test_notification_v47()
  to authenticated;

-- Production scheduler (run once in deployment):
-- select cron.schedule(
--   'valuation-crm-followup-v47',
--   '*/5 * * * *',
--   $$select public.valuation_crm_followup_notify_tick_v47();$$
-- );

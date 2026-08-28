-- Valuation CRM V48
-- Notification center, CRM-specific push preferences, delivery status and follow-up snooze.

alter table public.notification_preferences
  add column if not exists valuation_crm_leads boolean not null default true,
  add column if not exists valuation_crm_followups boolean not null default true;

alter table public.user_notifications
  add column if not exists push_status text not null default 'pending',
  add column if not exists push_delivered_count integer not null default 0,
  add column if not exists push_last_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='user_notifications_push_status_check'
      and conrelid='public.user_notifications'::regclass
  ) then
    alter table public.user_notifications
      add constraint user_notifications_push_status_check
      check (push_status in ('pending','delivered','skipped_preference','deferred_quiet','no_devices','retrying'));
  end if;
end $$;

create index if not exists user_notifications_user_push_status_idx
  on public.user_notifications(user_id,push_status,created_at desc);

create or replace function public.valuation_crm_notification_center_v48(p_limit integer default 50)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit,50), 100));
  v_result jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  select jsonb_build_object(
    'preferences', coalesce((
      select to_jsonb(p) - 'user_id'
      from public.notification_preferences p
      where p.user_id = v_uid
    ), jsonb_build_object(
      'valuation_crm_leads', true,
      'valuation_crm_followups', true,
      'quiet_hours_enabled', false,
      'quiet_hours_start', null,
      'quiet_hours_end', null
    )),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'user_agent', s.user_agent,
        'enabled', s.enabled,
        'created_at', s.created_at,
        'last_seen_at', s.last_seen_at
      ) order by s.last_seen_at desc)
      from public.push_subscriptions s
      where s.user_id = v_uid
    ), '[]'::jsonb),
    'unread_count', (
      select count(*)
      from public.user_notifications n
      where n.user_id = v_uid
        and n.notification_type like 'valuation_crm_%'
        and n.read_at is null
    ),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select n.id,n.notification_type,n.title,n.body,n.entity_id,n.metadata,
               n.created_at,n.push_sent_at,n.read_at,n.push_status,
               n.push_delivered_count,n.push_last_error
        from public.user_notifications n
        where n.user_id = v_uid
          and n.notification_type like 'valuation_crm_%'
        order by n.created_at desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.valuation_crm_notification_center_v48(integer) from public, anon;
grant execute on function public.valuation_crm_notification_center_v48(integer) to authenticated;

create or replace function public.set_valuation_crm_notification_preferences_v48(
  p_leads boolean,
  p_followups boolean,
  p_quiet_enabled boolean,
  p_quiet_start time default null,
  p_quiet_end time default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if coalesce(p_quiet_enabled,false) and (p_quiet_start is null or p_quiet_end is null) then
    raise exception 'quiet_hours_required';
  end if;

  insert into public.notification_preferences(
    user_id, valuation_crm_leads, valuation_crm_followups,
    quiet_hours_enabled, quiet_hours_start, quiet_hours_end
  ) values (
    v_uid, coalesce(p_leads,true), coalesce(p_followups,true),
    coalesce(p_quiet_enabled,false), p_quiet_start, p_quiet_end
  )
  on conflict (user_id) do update set
    valuation_crm_leads = excluded.valuation_crm_leads,
    valuation_crm_followups = excluded.valuation_crm_followups,
    quiet_hours_enabled = excluded.quiet_hours_enabled,
    quiet_hours_start = excluded.quiet_hours_start,
    quiet_hours_end = excluded.quiet_hours_end,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row) - 'user_id';
end;
$$;

revoke all on function public.set_valuation_crm_notification_preferences_v48(boolean,boolean,boolean,time,time) from public, anon;
grant execute on function public.set_valuation_crm_notification_preferences_v48(boolean,boolean,boolean,time,time) to authenticated;

create or replace function public.mark_valuation_crm_notification_read_v48(p_id uuid)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  update public.user_notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and user_id = auth.uid()
    and notification_type like 'valuation_crm_%';
  return found;
end;
$$;

revoke all on function public.mark_valuation_crm_notification_read_v48(uuid) from public, anon;
grant execute on function public.mark_valuation_crm_notification_read_v48(uuid) to authenticated;

create or replace function public.mark_all_valuation_crm_notifications_read_v48()
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  update public.user_notifications
  set read_at = now()
  where user_id = auth.uid()
    and notification_type like 'valuation_crm_%'
    and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_all_valuation_crm_notifications_read_v48() from public, anon;
grant execute on function public.mark_all_valuation_crm_notifications_read_v48() to authenticated;

create or replace function public.snooze_valuation_crm_followup_v48(p_lead_id uuid, p_minutes integer)
returns timestamptz
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_until timestamptz;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  if p_minutes not in (60, 1440, 4320, 10080) then raise exception 'invalid_snooze'; end if;

  v_until := now() + make_interval(mins => p_minutes);
  update public.valuation_leads
  set follow_up_at = v_until, updated_at = now()
  where id = p_lead_id
    and owner_user_id = auth.uid()
    and status <> 'closed'
    and coalesce(outcome,'open') = 'open';

  if not found then raise exception 'lead_not_found'; end if;
  return v_until;
end;
$$;

revoke all on function public.snooze_valuation_crm_followup_v48(uuid,integer) from public, anon;
grant execute on function public.snooze_valuation_crm_followup_v48(uuid,integer) to authenticated;

alter table public.valuation_crm_profiles
  add column if not exists crm_last_seen_at timestamptz not null default now();

create or replace function public.valuation_crm_notifications_v46()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with me as (
  select auth.uid() as uid
), seen as (
  select coalesce(
    (select p.crm_last_seen_at from public.valuation_crm_profiles p, me where p.user_id = me.uid),
    now()
  ) as last_seen
), mine as (
  select l.*,
    (l.created_at > (select last_seen from seen)) as is_unread,
    (l.follow_up_at is not null and l.follow_up_at <= now() and l.status <> 'closed') as is_overdue,
    (l.follow_up_at is not null
      and timezone('Asia/Tbilisi', l.follow_up_at)::date = timezone('Asia/Tbilisi', now())::date
      and l.status <> 'closed') as is_due_today
  from public.valuation_leads l, me
  where l.owner_user_id = me.uid
), attention as (
  select * from mine where is_unread or is_overdue
)
select jsonb_build_object(
  'last_seen_at', (select last_seen from seen),
  'unread_count', (select count(*) from mine where is_unread),
  'overdue_count', (select count(*) from mine where is_overdue),
  'due_today_count', (select count(*) from mine where is_due_today),
  'urgent_open_count', (select count(*) from mine where priority = 'urgent' and coalesce(outcome,'open') = 'open' and status <> 'closed'),
  'attention_count', (select count(*) from attention),
  'latest_unread', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select id,client_name,phone,city,address,estimated_value,created_at,follow_up_at,priority,status,outcome
      from mine
      where is_unread
      order by created_at desc
      limit 3
    ) x
  ), '[]'::jsonb),
  'due_items', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.follow_up_at asc)
    from (
      select id,client_name,phone,city,address,estimated_value,created_at,follow_up_at,priority,status,outcome
      from mine
      where is_overdue
      order by follow_up_at asc
      limit 3
    ) x
  ), '[]'::jsonb)
);
$$;

create or replace function public.mark_valuation_crm_seen_v46()
returns timestamptz
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  insert into public.valuation_crm_profiles(user_id, crm_last_seen_at)
  values (v_uid, v_now)
  on conflict(user_id) do update
    set crm_last_seen_at = excluded.crm_last_seen_at;

  return v_now;
end;
$$;

revoke all on function public.valuation_crm_notifications_v46() from public;
revoke all on function public.valuation_crm_notifications_v46() from anon;
grant execute on function public.valuation_crm_notifications_v46() to authenticated;

revoke all on function public.mark_valuation_crm_seen_v46() from public;
revoke all on function public.mark_valuation_crm_seen_v46() from anon;
grant execute on function public.mark_valuation_crm_seen_v46() to authenticated;

create index if not exists valuation_leads_owner_created_unread_v46_idx
  on public.valuation_leads(owner_user_id, created_at desc);

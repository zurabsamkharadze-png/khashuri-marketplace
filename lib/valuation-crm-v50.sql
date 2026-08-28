-- Valuation CRM V50
-- Dynamic daily work plan built from lead score, follow-up urgency, priority and property value.

create or replace function public.valuation_crm_daily_plan_v50(p_limit integer default 100)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit,100), 200));
  v_end_today timestamptz := (((now() at time zone 'Asia/Tbilisi')::date + 1)::timestamp at time zone 'Asia/Tbilisi');
  v_result jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  with base as (
    select l.*,
      greatest(0, least(160,
        coalesce(l.lead_score,0)
        + case when l.follow_up_at is not null and l.follow_up_at <= now() then 40
               when l.follow_up_at is not null and l.follow_up_at <= now() + interval '4 hours' then 28
               when l.follow_up_at is not null and l.follow_up_at < v_end_today then 18
               else 0 end
        + case when l.priority='urgent' then 22 when l.priority='high' then 12 when l.priority='low' then -4 else 0 end
        + case when l.status='new' and l.created_at >= now() - interval '2 hours' then 18
               when l.status='new' and l.created_at >= now() - interval '24 hours' then 10 else 0 end
        + case when l.last_contact_at is null then 6 else 0 end
        + case when coalesce(l.estimated_value,0) >= 250000 then 12
               when coalesce(l.estimated_value,0) >= 100000 then 7
               when coalesce(l.estimated_value,0) >= 50000 then 3 else 0 end
      ))::integer as plan_score
    from public.valuation_leads l
    where l.owner_user_id = v_uid
      and l.status <> 'closed'
      and coalesce(l.outcome,'open')='open'
  ), classified as (
    select b.*,
      case
        when (b.follow_up_at is not null and b.follow_up_at <= now())
          or b.priority='urgent'
          or b.plan_score >= 105
          or (b.status='new' and b.created_at >= now()-interval '2 hours' and coalesce(b.lead_score,0)>=65)
        then 'now'
        when (b.follow_up_at is not null and b.follow_up_at < v_end_today)
          or b.plan_score >= 78
          or b.status='new'
        then 'today'
        else 'later'
      end as plan_bucket,
      array_remove(array[
        case when b.follow_up_at is not null and b.follow_up_at <= now() then 'Просрочен follow-up' end,
        case when b.follow_up_at is not null and b.follow_up_at > now() and b.follow_up_at <= now()+interval '4 hours' then 'Follow-up в ближайшие 4 часа' end,
        case when b.priority='urgent' then 'Срочный приоритет' when b.priority='high' then 'Высокий приоритет' end,
        case when coalesce(b.lead_score,0)>=70 then 'Горячий лид · '||b.lead_score::text end,
        case when b.status='new' and b.created_at >= now()-interval '2 hours' then 'Новая заявка < 2 часов' end,
        case when b.last_contact_at is null then 'Контакта ещё не было' end,
        case when coalesce(b.estimated_value,0)>=250000 then 'Объект ≥ $250k' when coalesce(b.estimated_value,0)>=100000 then 'Объект ≥ $100k' end
      ], null) as plan_reasons
    from base b
  ), limited as (
    select * from classified
    order by case plan_bucket when 'now' then 1 when 'today' then 2 else 3 end,
             plan_score desc, follow_up_at asc nulls last, created_at desc
    limit v_limit
  )
  select jsonb_build_object(
    'generated_at', now(),
    'timezone', 'Asia/Tbilisi',
    'summary', jsonb_build_object(
      'now_count', count(*) filter (where plan_bucket='now'),
      'today_count', count(*) filter (where plan_bucket='today'),
      'later_count', count(*) filter (where plan_bucket='later'),
      'overdue_count', count(*) filter (where follow_up_at is not null and follow_up_at <= now()),
      'no_contact_count', count(*) filter (where last_contact_at is null),
      'hot_count', count(*) filter (where coalesce(lead_score,0)>=70),
      'value_now', coalesce(sum(estimated_value) filter (where plan_bucket='now'),0),
      'value_today', coalesce(sum(estimated_value) filter (where plan_bucket in ('now','today')),0)
    ),
    'tasks', coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'client_name',client_name,'phone',phone,'city',city,
      'estimated_value',estimated_value,'status',status,'priority',priority,
      'lead_score',lead_score,'lead_grade',lead_grade,'follow_up_at',follow_up_at,
      'last_contact_at',last_contact_at,'created_at',created_at,
      'plan_score',plan_score,'plan_bucket',plan_bucket,'plan_reasons',plan_reasons
    ) order by case plan_bucket when 'now' then 1 when 'today' then 2 else 3 end,
               plan_score desc, follow_up_at asc nulls last, created_at desc),'[]'::jsonb)
  ) into v_result
  from limited;

  return v_result;
end;
$$;

revoke all on function public.valuation_crm_daily_plan_v50(integer) from public, anon;
grant execute on function public.valuation_crm_daily_plan_v50(integer) to authenticated;

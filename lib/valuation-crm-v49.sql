-- Valuation CRM V49
-- Transparent lead scoring 0..100, temperature grade and hourly time-sensitive recalculation.

alter table public.valuation_leads
  add column if not exists lead_score integer not null default 0,
  add column if not exists lead_grade text not null default 'cold',
  add column if not exists lead_score_reasons jsonb not null default '[]'::jsonb,
  add column if not exists lead_score_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='valuation_leads_score_check' and conrelid='public.valuation_leads'::regclass) then
    alter table public.valuation_leads add constraint valuation_leads_score_check check (lead_score between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='valuation_leads_grade_check' and conrelid='public.valuation_leads'::regclass) then
    alter table public.valuation_leads add constraint valuation_leads_grade_check check (lead_grade in ('cold','warm','hot'));
  end if;
end $$;

create index if not exists valuation_leads_owner_score_idx on public.valuation_leads(owner_user_id,lead_score desc,created_at desc);

create or replace function public.valuation_crm_score_payload_v49(p public.valuation_leads)
returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare
  v_score integer:=10; v_grade text; v_reasons jsonb:='[]'::jsonb;
  v_digits text:=regexp_replace(coalesce(p.phone,''),'\D','','g'); v_until interval;
begin
  if p.status='closed' or coalesce(p.outcome,'open')<>'open' then
    return jsonb_build_object('score',0,'grade','cold','reasons',jsonb_build_array('Сделка закрыта'));
  end if;
  v_reasons:=v_reasons||jsonb_build_array('Активный лид +10');
  if p.estimated_value is not null then
    if p.estimated_value>=200000 then v_score:=v_score+25; v_reasons:=v_reasons||jsonb_build_array('Объект ≥ $200k +25');
    elsif p.estimated_value>=100000 then v_score:=v_score+20; v_reasons:=v_reasons||jsonb_build_array('Объект ≥ $100k +20');
    elsif p.estimated_value>=50000 then v_score:=v_score+15; v_reasons:=v_reasons||jsonb_build_array('Объект ≥ $50k +15');
    elsif p.estimated_value>=20000 then v_score:=v_score+10; v_reasons:=v_reasons||jsonb_build_array('Объект ≥ $20k +10');
    else v_score:=v_score+5; v_reasons:=v_reasons||jsonb_build_array('Есть оценка объекта +5'); end if;
  end if;
  if length(v_digits)>=9 then v_score:=v_score+10; v_reasons:=v_reasons||jsonb_build_array('Корректный телефон +10'); end if;
  if nullif(trim(coalesce(p.cadastral_code,'')),'') is not null then v_score:=v_score+8; v_reasons:=v_reasons||jsonb_build_array('Есть кадастр +8'); end if;
  if nullif(trim(coalesce(p.city,'')),'') is not null then v_score:=v_score+4; v_reasons:=v_reasons||jsonb_build_array('Указан город +4'); end if;
  if nullif(trim(coalesce(p.address,'')),'') is not null then v_score:=v_score+4; v_reasons:=v_reasons||jsonb_build_array('Указан адрес +4'); end if;
  if nullif(trim(coalesce(p.comment,'')),'') is not null then v_score:=v_score+3; v_reasons:=v_reasons||jsonb_build_array('Есть комментарий клиента +3'); end if;
  if p.owner_price is not null then v_score:=v_score+4; v_reasons:=v_reasons||jsonb_build_array('Указана цена собственника +4'); end if;
  case p.priority when 'urgent' then v_score:=v_score+18;v_reasons:=v_reasons||jsonb_build_array('Срочный приоритет +18'); when 'high' then v_score:=v_score+12;v_reasons:=v_reasons||jsonb_build_array('Высокий приоритет +12'); when 'normal' then v_score:=v_score+4;v_reasons:=v_reasons||jsonb_build_array('Обычный приоритет +4'); else null; end case;
  case p.status when 'new' then v_score:=v_score+7;v_reasons:=v_reasons||jsonb_build_array('Новый лид +7'); when 'contacted' then v_score:=v_score+5;v_reasons:=v_reasons||jsonb_build_array('Контакт установлен +5'); when 'working' then v_score:=v_score+8;v_reasons:=v_reasons||jsonb_build_array('В работе +8'); else null; end case;
  if p.created_at>=now()-interval '24 hours' then v_score:=v_score+8;v_reasons:=v_reasons||jsonb_build_array('Свежая заявка <24ч +8'); elsif p.created_at>=now()-interval '72 hours' then v_score:=v_score+4;v_reasons:=v_reasons||jsonb_build_array('Свежая заявка <72ч +4'); end if;
  if p.follow_up_at is not null then
    v_until:=p.follow_up_at-now();
    if p.follow_up_at<=now() then v_score:=v_score+15;v_reasons:=v_reasons||jsonb_build_array('Follow-up просрочен +15');
    elsif v_until<=interval '24 hours' then v_score:=v_score+10;v_reasons:=v_reasons||jsonb_build_array('Follow-up в ближайшие 24ч +10');
    elsif v_until<=interval '3 days' then v_score:=v_score+5;v_reasons:=v_reasons||jsonb_build_array('Follow-up в ближайшие 3 дня +5'); end if;
  elsif p.last_contact_at is null and p.status='new' then v_score:=v_score+5;v_reasons:=v_reasons||jsonb_build_array('Ещё не связывались +5'); end if;
  v_score:=greatest(0,least(100,v_score)); v_grade:=case when v_score>=70 then 'hot' when v_score>=45 then 'warm' else 'cold' end;
  return jsonb_build_object('score',v_score,'grade',v_grade,'reasons',v_reasons);
end $$;
revoke all on function public.valuation_crm_score_payload_v49(public.valuation_leads) from public,anon,authenticated;

create or replace function public.valuation_crm_apply_score_v49() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v jsonb;
begin
  v:=public.valuation_crm_score_payload_v49(new);
  new.lead_score:=(v->>'score')::integer; new.lead_grade:=v->>'grade'; new.lead_score_reasons:=coalesce(v->'reasons','[]'::jsonb); new.lead_score_updated_at:=now();
  return new;
end $$;
revoke all on function public.valuation_crm_apply_score_v49() from public,anon,authenticated;

drop trigger if exists valuation_crm_apply_score_v49 on public.valuation_leads;
create trigger valuation_crm_apply_score_v49 before insert or update of status,priority,client_name,phone,comment,cadastral_code,city,address,estimated_value,owner_price,follow_up_at,last_contact_at,outcome,deal_value,closed_reason on public.valuation_leads for each row execute function public.valuation_crm_apply_score_v49();

update public.valuation_leads set priority=priority;

create or replace function public.valuation_crm_recalculate_scores_v49() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer:=0;
begin update public.valuation_leads set priority=priority where status<>'closed' and coalesce(outcome,'open')='open'; get diagnostics v_count=row_count; return v_count; end $$;
revoke all on function public.valuation_crm_recalculate_scores_v49() from public,anon,authenticated;
grant execute on function public.valuation_crm_recalculate_scores_v49() to service_role;

create or replace function public.valuation_crm_lead_scoring_v49(p_limit integer default 100) returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_limit integer:=greatest(1,least(coalesce(p_limit,100),200));v_result jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  select jsonb_build_object('hot_count',count(*) filter(where lead_grade='hot' and status<>'closed' and coalesce(outcome,'open')='open'),'warm_count',count(*) filter(where lead_grade='warm' and status<>'closed' and coalesce(outcome,'open')='open'),'cold_count',count(*) filter(where lead_grade='cold' and status<>'closed' and coalesce(outcome,'open')='open'),'average_score',coalesce(round(avg(lead_score) filter(where status<>'closed' and coalesce(outcome,'open')='open')),0),'leads',coalesce((select jsonb_agg(to_jsonb(x) order by x.lead_score desc,x.created_at desc) from (select id,client_name,phone,city,address,estimated_value,status,priority,follow_up_at,last_contact_at,lead_score,lead_grade,lead_score_reasons,lead_score_updated_at,created_at from public.valuation_leads where owner_user_id=v_uid and status<>'closed' and coalesce(outcome,'open')='open' order by lead_score desc,created_at desc limit v_limit)x),'[]'::jsonb)) into v_result from public.valuation_leads where owner_user_id=v_uid;
  return v_result;
end $$;
revoke all on function public.valuation_crm_lead_scoring_v49(integer) from public,anon;
grant execute on function public.valuation_crm_lead_scoring_v49(integer) to authenticated;

select cron.unschedule(jobid) from cron.job where jobname='valuation-crm-score-v49';
select cron.schedule('valuation-crm-score-v49','17 * * * *',$$select public.valuation_crm_recalculate_scores_v49();$$);

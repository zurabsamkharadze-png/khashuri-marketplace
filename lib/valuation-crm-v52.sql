-- Valuation CRM V52
-- Automatic follow-up manager with anti-spam sequence, queue, pause and manual completion.

create table if not exists private.valuation_crm_followup_sequence_v52 (
  lead_id uuid primary key references public.valuation_leads(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  touch_count integer not null default 0 check (touch_count between 0 and 4),
  last_touch_at timestamptz,
  last_channel text check (last_channel is null or last_channel in ('call','whatsapp','telegram','other')),
  next_action_at timestamptz,
  paused_until timestamptz,
  stopped_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists valuation_crm_followup_v52_owner_due_idx
  on private.valuation_crm_followup_sequence_v52(owner_user_id, enabled, next_action_at);

alter table private.valuation_crm_followup_sequence_v52 enable row level security;
revoke all on private.valuation_crm_followup_sequence_v52 from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.valuation_crm_followup_plan_v52_impl(p_lead_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  l public.valuation_leads;
  s private.valuation_crm_followup_sequence_v52;
  v_has_seq boolean := false;
  v_stage text;
  v_state text;
  v_due timestamptz;
  v_channel text;
  v_message text;
  v_next_action text;
  v_wait_minutes integer := 0;
  v_touch_count integer := 0;
  v_enabled boolean := true;
  v_paused_until timestamptz;
  v_name text;
  v_location text;
  v_value text;
  v_price_gap numeric;
  v_end_today timestamptz := (((now() at time zone 'Asia/Tbilisi')::date + 1)::timestamp at time zone 'Asia/Tbilisi');
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  select * into l
  from public.valuation_leads
  where id = p_lead_id and owner_user_id = v_uid;
  if not found then raise exception 'lead_not_found'; end if;

  select * into s
  from private.valuation_crm_followup_sequence_v52
  where lead_id = p_lead_id and owner_user_id = v_uid;
  v_has_seq := found;

  if v_has_seq then
    v_touch_count := s.touch_count;
    v_enabled := s.enabled;
    v_paused_until := s.paused_until;
  end if;

  v_name := coalesce(nullif(trim(l.client_name),''), case when l.language='ka' then 'კლიენტო' else 'клиент' end);
  v_location := nullif(concat_ws(', ', nullif(l.city,''), nullif(l.address,'')), '');
  v_value := case when l.estimated_value is not null then '$' || trim(to_char(l.estimated_value,'FM999G999G999G990')) else null end;
  v_price_gap := case when coalesce(l.estimated_value,0) > 0 and l.owner_price is not null
    then round(((l.owner_price-l.estimated_value)/l.estimated_value)*100,1) else null end;

  if l.status='closed' or coalesce(l.outcome,'open') <> 'open' then
    v_stage := 'closed'; v_state := 'closed'; v_due := null;
  elsif not v_enabled then
    v_stage := 'stopped'; v_state := 'stopped'; v_due := null;
  elsif v_touch_count >= 4 then
    v_stage := 'completed'; v_state := 'completed'; v_due := null;
  elsif v_paused_until is not null and v_paused_until > now() then
    v_stage := 'paused'; v_state := 'paused'; v_due := v_paused_until;
  else
    if v_touch_count = 0 and l.last_contact_at is null then
      v_stage := 'initial_contact';
      v_due := coalesce(s.next_action_at, l.follow_up_at, l.created_at);
      v_wait_minutes := 2880;
    elsif v_touch_count = 0 then
      v_stage := 'after_first_contact';
      v_due := coalesce(s.next_action_at, l.follow_up_at, l.last_contact_at + interval '1 day');
      v_wait_minutes := 2880;
    elsif v_touch_count = 1 then
      v_stage := 'no_response_1';
      v_due := coalesce(s.next_action_at, l.follow_up_at, s.last_touch_at + interval '2 days');
      v_wait_minutes := 4320;
    elsif v_touch_count = 2 then
      v_stage := case when l.status='working' then 'price_discussion' else 'no_response_2' end;
      v_due := coalesce(s.next_action_at, l.follow_up_at, s.last_touch_at + interval '3 days');
      v_wait_minutes := 10080;
    else
      v_stage := 'final_followup';
      v_due := coalesce(s.next_action_at, l.follow_up_at, s.last_touch_at + interval '7 days');
      v_wait_minutes := 0;
    end if;

    if v_due <= now() then v_state := 'overdue';
    elsif v_due < v_end_today then v_state := 'due_today';
    else v_state := 'upcoming'; end if;
  end if;

  v_channel := case
    when l.contact_method='telegram' then 'telegram'
    when v_stage='initial_contact' and l.contact_method='phone' then 'call'
    when v_stage='initial_contact' and coalesce(l.lead_score,0) >= 70 then 'call'
    else 'whatsapp'
  end;

  if l.language='ka' then
    v_next_action := case v_stage
      when 'initial_contact' then 'პირველი კონტაქტი: დააზუსტეთ გაყიდვის აქტუალურობა, ფასი და ვადა.'
      when 'after_first_contact' then 'მოკლე follow-up პირველი საუბრის შემდეგ.'
      when 'no_response_1' then 'მეორე მოკლე შეხსენება — ზეწოლის გარეშე.'
      when 'no_response_2' then 'მესამე შეხსენება და კითხვა, ისევ აქტუალურია თუ არა გაყიდვა.'
      when 'price_discussion' then 'დაუბრუნდით ფასს ბაზრის არგუმენტებით და კონკრეტული შემდეგი ნაბიჯით.'
      when 'final_followup' then 'ბოლო თავაზიანი follow-up; პასუხის გარეშე ჯაჭვი შეჩერდება.'
      when 'paused' then 'Follow-up დროებით შეჩერებულია.'
      when 'stopped' then 'Follow-up ჯაჭვი ხელით შეჩერებულია.'
      when 'completed' then '4 შეხება დასრულდა — ავტომატური ჯაჭვი აღარ გაგრძელდება.'
      else 'გარიგება დახურულია.' end;

    v_message := case v_stage
      when 'initial_contact' then 'გამარჯობა, '||v_name||'! თქვენ დატოვეთ განაცხადი უძრავი ქონების შეფასებაზე.'||coalesce(' ობიექტი: '||v_location||'.','')||coalesce(' წინასწარი შეფასება დაახლოებით '||v_value||'-ია.','')||' გაყიდვა ჯერ კიდევ აქტუალურია?'
      when 'after_first_contact' then 'გამარჯობა, '||v_name||'! მადლობა წინა საუბრისთვის. მინდოდა მოკლედ დამეზუსტებინა, ისევ აქტუალურია თუ არა ობიექტის გაყიდვა და შეგვიძლია თუ არა შემდეგ ნაბიჯზე შეთანხმება.'
      when 'no_response_1' then 'გამარჯობა, '||v_name||'! მოკლედ შეგახსენებთ თქვენს უძრავი ქონების შეფასების განაცხადს. თუ გაყიდვა ისევ აქტუალურია, მომწერეთ თქვენთვის მოსახერხებელ დროს.'
      when 'no_response_2' then 'გამარჯობა, '||v_name||'! კიდევ ერთხელ გიკავშირდებით შეფასების საკითხზე. თუ გეგმები შეიცვალა, უბრალოდ შემატყობინეთ; თუ ისევ აქტუალურია, მზად ვარ დაგეხმაროთ შემდეგ ნაბიჯში.'
      when 'price_discussion' then 'გამარჯობა, '||v_name||'! ვუბრუნდები ფასის საკითხს. შეგვიძლია შევადაროთ თქვენი მოლოდინი მიმდინარე საბაზრო შეფასებას და შევთანხმდეთ რეალისტურ სამუშაო დიაპაზონზე.'
      when 'final_followup' then 'გამარჯობა, '||v_name||'! ბოლოს დაგიკავშირდებით ამ განაცხადთან დაკავშირებით. თუ გაყიდვა ისევ აქტუალურია, სიამოვნებით გავაგრძელებ დახმარებას; თუ არა — აღარ შეგაწუხებთ.'
      else '' end;
  else
    v_next_action := case v_stage
      when 'initial_contact' then 'Первый контакт: уточнить актуальность продажи, цену и сроки.'
      when 'after_first_contact' then 'Короткий follow-up после первого разговора.'
      when 'no_response_1' then 'Второе короткое напоминание без давления.'
      when 'no_response_2' then 'Третье касание и проверка, актуальна ли ещё продажа.'
      when 'price_discussion' then 'Вернуться к цене с рыночными аргументами и конкретным следующим шагом.'
      when 'final_followup' then 'Последний вежливый follow-up; без ответа цепочка остановится.'
      when 'paused' then 'Follow-up временно поставлен на паузу.'
      when 'stopped' then 'Цепочка follow-up остановлена вручную.'
      when 'completed' then '4 касания завершены — автоматическая цепочка больше не продолжается.'
      else 'Сделка закрыта.' end;

    v_message := case v_stage
      when 'initial_contact' then 'Здравствуйте, '||v_name||'! Вы оставляли заявку на оценку недвижимости.'||coalesce(' Объект: '||v_location||'.','')||coalesce(' Предварительная оценка около '||v_value||'.','')||' Продажа ещё актуальна?'
      when 'after_first_contact' then 'Здравствуйте, '||v_name||'! Спасибо за прошлый разговор. Хотел коротко уточнить: продажа объекта ещё актуальна и можем ли мы согласовать следующий шаг?'
      when 'no_response_1' then 'Здравствуйте, '||v_name||'! Коротко напомню о вашей заявке на оценку недвижимости. Если продажа ещё актуальна, напишите в удобное для вас время.'
      when 'no_response_2' then 'Здравствуйте, '||v_name||'! Ещё раз возвращаюсь к вопросу оценки. Если планы изменились — просто сообщите; если продажа актуальна, помогу перейти к следующему шагу.'
      when 'price_discussion' then 'Здравствуйте, '||v_name||'! Возвращаюсь к вопросу цены. Предлагаю сравнить ваши ожидания с текущей рыночной оценкой и определить реалистичный рабочий диапазон.'
      when 'final_followup' then 'Здравствуйте, '||v_name||'! Последний раз уточню по вашей заявке. Если продажа ещё актуальна — с удовольствием продолжу; если нет, больше беспокоить не буду.'
      else '' end;
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'lead', jsonb_build_object(
      'id',l.id,'client_name',l.client_name,'phone',l.phone,'city',l.city,'address',l.address,
      'language',l.language,'status',l.status,'outcome',l.outcome,'priority',l.priority,
      'lead_score',l.lead_score,'estimated_value',l.estimated_value,'owner_price',l.owner_price,
      'last_contact_at',l.last_contact_at,'follow_up_at',l.follow_up_at
    ),
    'sequence', jsonb_build_object(
      'enabled',v_enabled,'touch_count',v_touch_count,'touches_left',greatest(0,4-v_touch_count),
      'last_touch_at',case when v_has_seq then s.last_touch_at else null end,
      'last_channel',case when v_has_seq then s.last_channel else null end,
      'paused_until',v_paused_until,
      'stopped_reason',case when v_has_seq then s.stopped_reason else null end
    ),
    'recommendation', jsonb_build_object(
      'stage',v_stage,'state',v_state,'due_at',v_due,'recommended_channel',v_channel,
      'next_action',v_next_action,'message_text',v_message,
      'wait_after_complete_minutes',v_wait_minutes,
      'price_gap_percent',v_price_gap,
      'can_contact',v_stage in ('initial_contact','after_first_contact','no_response_1','no_response_2','price_discussion','final_followup')
    ),
    'anti_spam', jsonb_build_object(
      'max_touches',4,
      'minimum_repeat_guard_minutes',5,
      'automatic_send',false,
      'note',case when l.language='ka' then 'შეტყობინება ავტომატურად არ იგზავნება — გაგზავნას ყოველთვის ადასტურებთ თქვენ.' else 'Сообщение автоматически не отправляется — отправку всегда подтверждаете вы.' end
    )
  );
end;
$$;

create or replace function private.complete_valuation_crm_followup_v52_impl(p_lead_id uuid, p_channel text)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  l public.valuation_leads;
  s private.valuation_crm_followup_sequence_v52;
  v_channel text := lower(trim(coalesce(p_channel,'')));
  v_contact_channel text;
  v_new_count integer;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if v_channel not in ('call','whatsapp','telegram','other') then raise exception 'invalid_channel'; end if;

  select * into l from public.valuation_leads where id=p_lead_id and owner_user_id=v_uid;
  if not found then raise exception 'lead_not_found'; end if;
  if l.status='closed' or coalesce(l.outcome,'open')<>'open' then raise exception 'lead_closed'; end if;

  insert into private.valuation_crm_followup_sequence_v52(lead_id,owner_user_id)
  values(p_lead_id,v_uid)
  on conflict (lead_id) do nothing;

  select * into s from private.valuation_crm_followup_sequence_v52
  where lead_id=p_lead_id and owner_user_id=v_uid for update;

  if not s.enabled then raise exception 'sequence_stopped'; end if;
  if s.touch_count >= 4 then raise exception 'sequence_complete'; end if;
  if s.last_touch_at is not null and s.last_touch_at > now()-interval '5 minutes' then raise exception 'followup_recently_completed'; end if;

  v_contact_channel := case when v_channel='call' then 'call' when v_channel='whatsapp' then 'whatsapp' else 'other' end;
  perform public.record_valuation_crm_contact_v45(p_lead_id,v_contact_channel);

  v_new_count := s.touch_count + 1;
  v_next := case v_new_count
    when 1 then now()+interval '2 days'
    when 2 then now()+interval '3 days'
    when 3 then now()+interval '7 days'
    else null end;

  update private.valuation_crm_followup_sequence_v52
  set touch_count=v_new_count,
      last_touch_at=now(),
      last_channel=v_channel,
      next_action_at=v_next,
      paused_until=null,
      enabled=(v_new_count<4),
      stopped_reason=case when v_new_count>=4 then 'sequence_complete' else null end,
      updated_at=now()
  where lead_id=p_lead_id and owner_user_id=v_uid;

  update public.valuation_leads
  set follow_up_at=v_next, updated_at=now()
  where id=p_lead_id and owner_user_id=v_uid;

  return private.valuation_crm_followup_plan_v52_impl(p_lead_id);
end;
$$;

create or replace function private.pause_valuation_crm_followup_v52_impl(p_lead_id uuid, p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  l public.valuation_leads;
  s private.valuation_crm_followup_sequence_v52;
  v_until timestamptz;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_days not in (1,3,7,30) then raise exception 'invalid_pause'; end if;
  select * into l from public.valuation_leads where id=p_lead_id and owner_user_id=v_uid;
  if not found then raise exception 'lead_not_found'; end if;
  if l.status='closed' or coalesce(l.outcome,'open')<>'open' then raise exception 'lead_closed'; end if;

  insert into private.valuation_crm_followup_sequence_v52(lead_id,owner_user_id)
  values(p_lead_id,v_uid)
  on conflict (lead_id) do nothing;
  select * into s from private.valuation_crm_followup_sequence_v52 where lead_id=p_lead_id and owner_user_id=v_uid for update;
  if s.touch_count>=4 then raise exception 'sequence_complete'; end if;

  v_until := now()+make_interval(days=>p_days);
  update private.valuation_crm_followup_sequence_v52
  set enabled=true, paused_until=v_until, next_action_at=v_until, stopped_reason=null, updated_at=now()
  where lead_id=p_lead_id and owner_user_id=v_uid;
  update public.valuation_leads set follow_up_at=v_until, updated_at=now()
  where id=p_lead_id and owner_user_id=v_uid;
  return private.valuation_crm_followup_plan_v52_impl(p_lead_id);
end;
$$;

create or replace function private.set_valuation_crm_followup_enabled_v52_impl(p_lead_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  l public.valuation_leads;
  s private.valuation_crm_followup_sequence_v52;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  select * into l from public.valuation_leads where id=p_lead_id and owner_user_id=v_uid;
  if not found then raise exception 'lead_not_found'; end if;
  if l.status='closed' or coalesce(l.outcome,'open')<>'open' then raise exception 'lead_closed'; end if;

  insert into private.valuation_crm_followup_sequence_v52(lead_id,owner_user_id)
  values(p_lead_id,v_uid)
  on conflict (lead_id) do nothing;
  select * into s from private.valuation_crm_followup_sequence_v52 where lead_id=p_lead_id and owner_user_id=v_uid for update;

  if p_enabled and s.touch_count>=4 then raise exception 'sequence_complete'; end if;
  if p_enabled then
    v_next := coalesce(s.next_action_at,l.follow_up_at,now()+interval '1 day');
    update private.valuation_crm_followup_sequence_v52
    set enabled=true, paused_until=null, stopped_reason=null, next_action_at=v_next, updated_at=now()
    where lead_id=p_lead_id and owner_user_id=v_uid;
    update public.valuation_leads set follow_up_at=v_next, updated_at=now() where id=p_lead_id and owner_user_id=v_uid;
  else
    update private.valuation_crm_followup_sequence_v52
    set enabled=false, paused_until=null, stopped_reason='manual', next_action_at=null, updated_at=now()
    where lead_id=p_lead_id and owner_user_id=v_uid;
    update public.valuation_leads set follow_up_at=null, updated_at=now() where id=p_lead_id and owner_user_id=v_uid;
  end if;

  return private.valuation_crm_followup_plan_v52_impl(p_lead_id);
end;
$$;

create or replace function private.valuation_crm_followup_queue_v52_impl(p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1,least(coalesce(p_limit,60),150));
  v_end_today timestamptz := (((now() at time zone 'Asia/Tbilisi')::date + 1)::timestamp at time zone 'Asia/Tbilisi');
  v_result jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  with base as (
    select l.id,l.client_name,l.phone,l.city,l.language,l.status,l.priority,l.lead_score,l.estimated_value,l.last_contact_at,l.follow_up_at,
           coalesce(s.enabled,true) as enabled,coalesce(s.touch_count,0) as touch_count,s.last_touch_at,s.last_channel,s.paused_until,s.stopped_reason,
           case
             when not coalesce(s.enabled,true) or coalesce(s.touch_count,0)>=4 then null
             when s.paused_until is not null and s.paused_until>now() then s.paused_until
             else coalesce(s.next_action_at,l.follow_up_at,case when l.last_contact_at is null then l.created_at else l.last_contact_at+interval '1 day' end)
           end as due_at
    from public.valuation_leads l
    left join private.valuation_crm_followup_sequence_v52 s on s.lead_id=l.id and s.owner_user_id=v_uid
    where l.owner_user_id=v_uid and l.status<>'closed' and coalesce(l.outcome,'open')='open'
  ), x as (
    select b.*,
      case
        when not enabled then 'stopped'
        when touch_count>=4 then 'completed'
        when paused_until is not null and paused_until>now() then 'paused'
        when due_at<=now() then 'overdue'
        when due_at<v_end_today then 'due_today'
        else 'upcoming' end as due_state,
      case
        when touch_count=0 and last_contact_at is null then 'initial_contact'
        when touch_count=0 then 'after_first_contact'
        when touch_count=1 then 'no_response_1'
        when touch_count=2 and status='working' then 'price_discussion'
        when touch_count=2 then 'no_response_2'
        when touch_count=3 then 'final_followup'
        else 'completed' end as stage
    from base b
  )
  select jsonb_build_object(
    'generated_at',now(),
    'summary',jsonb_build_object(
      'overdue_count',count(*) filter(where due_state='overdue'),
      'today_count',count(*) filter(where due_state='due_today'),
      'upcoming_count',count(*) filter(where due_state='upcoming'),
      'paused_count',count(*) filter(where due_state='paused'),
      'stopped_count',count(*) filter(where due_state in ('stopped','completed'))
    ),
    'items',coalesce((select jsonb_agg(to_jsonb(q) order by
      case q.due_state when 'overdue' then 0 when 'due_today' then 1 when 'upcoming' then 2 when 'paused' then 3 else 4 end,
      q.due_at nulls last,q.lead_score desc)
      from (select * from x order by
        case due_state when 'overdue' then 0 when 'due_today' then 1 when 'upcoming' then 2 when 'paused' then 3 else 4 end,
        due_at nulls last,lead_score desc limit v_limit) q),'[]'::jsonb)
  ) into v_result from x;
  return coalesce(v_result,jsonb_build_object('generated_at',now(),'summary',jsonb_build_object('overdue_count',0,'today_count',0,'upcoming_count',0,'paused_count',0,'stopped_count',0),'items','[]'::jsonb));
end;
$$;

revoke all on function private.valuation_crm_followup_plan_v52_impl(uuid) from public,anon,authenticated;
revoke all on function private.complete_valuation_crm_followup_v52_impl(uuid,text) from public,anon,authenticated;
revoke all on function private.pause_valuation_crm_followup_v52_impl(uuid,integer) from public,anon,authenticated;
revoke all on function private.set_valuation_crm_followup_enabled_v52_impl(uuid,boolean) from public,anon,authenticated;
revoke all on function private.valuation_crm_followup_queue_v52_impl(integer) from public,anon,authenticated;
grant execute on function private.valuation_crm_followup_plan_v52_impl(uuid) to authenticated;
grant execute on function private.complete_valuation_crm_followup_v52_impl(uuid,text) to authenticated;
grant execute on function private.pause_valuation_crm_followup_v52_impl(uuid,integer) to authenticated;
grant execute on function private.set_valuation_crm_followup_enabled_v52_impl(uuid,boolean) to authenticated;
grant execute on function private.valuation_crm_followup_queue_v52_impl(integer) to authenticated;

create or replace function public.valuation_crm_followup_plan_v52(p_lead_id uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_temp
as $$select private.valuation_crm_followup_plan_v52_impl(p_lead_id)$$;
create or replace function public.complete_valuation_crm_followup_v52(p_lead_id uuid,p_channel text)
returns jsonb language sql volatile security invoker set search_path=public,pg_temp
as $$select private.complete_valuation_crm_followup_v52_impl(p_lead_id,p_channel)$$;
create or replace function public.pause_valuation_crm_followup_v52(p_lead_id uuid,p_days integer)
returns jsonb language sql volatile security invoker set search_path=public,pg_temp
as $$select private.pause_valuation_crm_followup_v52_impl(p_lead_id,p_days)$$;
create or replace function public.set_valuation_crm_followup_enabled_v52(p_lead_id uuid,p_enabled boolean)
returns jsonb language sql volatile security invoker set search_path=public,pg_temp
as $$select private.set_valuation_crm_followup_enabled_v52_impl(p_lead_id,p_enabled)$$;
create or replace function public.valuation_crm_followup_queue_v52(p_limit integer default 60)
returns jsonb language sql stable security invoker set search_path=public,pg_temp
as $$select private.valuation_crm_followup_queue_v52_impl(p_limit)$$;

revoke all on function public.valuation_crm_followup_plan_v52(uuid) from public,anon;
revoke all on function public.complete_valuation_crm_followup_v52(uuid,text) from public,anon;
revoke all on function public.pause_valuation_crm_followup_v52(uuid,integer) from public,anon;
revoke all on function public.set_valuation_crm_followup_enabled_v52(uuid,boolean) from public,anon;
revoke all on function public.valuation_crm_followup_queue_v52(integer) from public,anon;
grant execute on function public.valuation_crm_followup_plan_v52(uuid) to authenticated;
grant execute on function public.complete_valuation_crm_followup_v52(uuid,text) to authenticated;
grant execute on function public.pause_valuation_crm_followup_v52(uuid,integer) to authenticated;
grant execute on function public.set_valuation_crm_followup_enabled_v52(uuid,boolean) to authenticated;
grant execute on function public.valuation_crm_followup_queue_v52(integer) to authenticated;

-- Valuation CRM V51
-- Rule-based manager assistant for a single owned lead.

create or replace function public.valuation_crm_manager_assistant_v51(p_lead_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  l public.valuation_leads;
  v_gap numeric;
  v_urgency text;
  v_next_action text;
  v_follow_minutes integer;
  v_location text;
  v_value text;
  v_channel text;
  v_call_script text;
  v_whatsapp text;
  v_tip text;
  v_points jsonb;
  v_objections jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;

  select * into l
  from public.valuation_leads
  where id = p_lead_id
    and owner_user_id = v_uid;

  if not found then raise exception 'lead_not_found'; end if;

  v_location := nullif(concat_ws(', ', nullif(l.city,''), nullif(l.address,'')), '');
  v_value := case when l.estimated_value is not null
    then '$' || trim(to_char(l.estimated_value, 'FM999G999G999G990'))
    else null end;
  v_gap := case when coalesce(l.estimated_value,0) > 0 and l.owner_price is not null
    then round(((l.owner_price - l.estimated_value) / l.estimated_value) * 100, 1)
    else null end;

  v_channel := case
    when l.contact_method in ('phone','whatsapp','telegram') then l.contact_method
    when coalesce(l.lead_score,0) >= 70 then 'phone'
    else 'whatsapp'
  end;

  if l.status = 'closed' or coalesce(l.outcome,'open') <> 'open' then
    v_urgency := 'closed';
    v_next_action := case when l.language='ka' then 'გარიგება დახურულია — გადაამოწმეთ შედეგი და შენიშვნები.' else 'Сделка закрыта — проверьте результат и заметки.' end;
    v_follow_minutes := 0;
  elsif l.follow_up_at is not null and l.follow_up_at <= now() then
    v_urgency := 'critical';
    v_next_action := case when l.language='ka' then 'დაურეკეთ ახლავე — follow-up ვადაგადაცილებულია.' else 'Позвонить сейчас — follow-up просрочен.' end;
    v_follow_minutes := 60;
  elsif coalesce(l.lead_score,0) >= 70 or l.priority in ('urgent','high') then
    v_urgency := 'high';
    v_next_action := case when v_channel='whatsapp'
      then case when l.language='ka' then 'გაუგზავნეთ WhatsApp ახლავე და შესთავაზეთ მოკლე ზარი.' else 'Отправить WhatsApp сейчас и предложить короткий звонок.' end
      else case when l.language='ka' then 'დაურეკეთ დღეს პირველ რიგში.' else 'Позвонить сегодня в первую очередь.' end end;
    v_follow_minutes := 1440;
  elsif l.status = 'new' then
    v_urgency := 'medium';
    v_next_action := case when v_channel='whatsapp'
      then case when l.language='ka' then 'გაუგზავნეთ პირველი WhatsApp და დააზუსტეთ გაყიდვის ვადა.' else 'Отправить первый WhatsApp и уточнить срок продажи.' end
      else case when l.language='ka' then 'პირველი ზარი: დააზუსტეთ მიზანი, ფასი და ვადები.' else 'Первый звонок: уточнить цель, цену и сроки.' end end;
    v_follow_minutes := 1440;
  elsif l.status = 'contacted' then
    v_urgency := 'medium';
    v_next_action := case when l.language='ka' then 'დააზუსტეთ მოტივაცია, სასურველი ფასი და შემდეგი ნაბიჯი.' else 'Уточнить мотивацию, желаемую цену и следующий шаг.' end;
    v_follow_minutes := 1440;
  else
    v_urgency := 'normal';
    v_next_action := case when l.language='ka' then 'გადააყვანეთ გარიგება შემდეგ ეტაპზე: ნახვა, დოკუმენტები ან ფასზე შეთანხმება.' else 'Продвинуть сделку: просмотр, документы или согласование цены.' end;
    v_follow_minutes := 4320;
  end if;

  if l.language = 'ka' then
    v_call_script := 'გამარჯობა, ' || coalesce(nullif(l.client_name,''),'') || '. '
      || case when l.status='new' then 'თქვენ დატოვეთ განაცხადი უძრავი ქონების შეფასებაზე. ' else 'გიკავშირდებით თქვენი უძრავი ქონების შეფასებასთან დაკავშირებით. ' end
      || case when v_location is not null then 'ობიექტი: '||v_location||'. ' else '' end
      || case when v_value is not null then 'წინასწარი შეფასება დაახლოებით '||v_value||'-ია. ' else '' end
      || 'მინდა მოკლედ დავაზუსტო: ობიექტის გაყიდვა ჯერ კიდევ აქტუალურია? რა ფასი და ვადა არის თქვენთვის მისაღები?';

    v_whatsapp := 'გამარჯობა, ' || coalesce(nullif(l.client_name,''),'') || '! '
      || 'გიკავშირდებით თქვენი უძრავი ქონების შეფასების განაცხადთან დაკავშირებით.'
      || case when v_location is not null then ' ობიექტი: '||v_location||'.' else '' end
      || case when v_value is not null then ' წინასწარი შეფასება დაახლოებით '||v_value||'-ია.' else '' end
      || ' მოსახერხებელია მოკლედ განვიხილოთ გაყიდვის გეგმები და შემდეგი ნაბიჯი?';

    v_tip := case
      when v_gap is not null and v_gap >= 15 then 'მესაკუთრის ფასი შეფასებაზე მნიშვნელოვნად მაღალია. არ იკამათოთ — აჩვენეთ ბაზრის არგუმენტები და შესთავაზეთ ფასის დიაპაზონი.'
      when v_gap is not null and v_gap <= -15 then 'მესაკუთრის ფასი შეფასებაზე დაბალია. გადაამოწმეთ, ხომ არ არის სწრაფი გაყიდვის მოტივაცია.'
      when coalesce(l.lead_score,0) >= 70 then 'მაღალი პოტენციალის ლიდია — საუბარი დაასრულეთ კონკრეტული შემდეგი ნაბიჯით და თარიღით.'
      else 'საუბრის ბოლოს აუცილებლად შეთანხმდით შემდეგ კონკრეტულ ნაბიჯსა და დროს.' end;

    v_points := jsonb_build_array(
      'ობიექტის გაყიდვა ჯერ კიდევ აქტუალურია?',
      'რა ფასი არის მისაღები მესაკუთრისთვის?',
      'რამდენად სწრაფად სურს გაყიდვა?',
      'როდის არის შესაძლებელი ობიექტის ნახვა?',
      'ყველა ძირითადი დოკუმენტი მზად არის?'
    );

    v_objections := jsonb_build_array(
      jsonb_build_object('objection','ფასი დაბალია','answer','გესმით. მოდით შევადაროთ რეალური ბაზრის მონაცემები და განვსაზღვროთ რეალისტური დიაპაზონი.'),
      jsonb_build_object('objection','ჯერ არ ვარ მზად','answer','კარგი. დავაფიქსიროთ როდის იქნება მოსახერხებელი დაბრუნება ამ საკითხზე, რომ ზედმეტად არ შეგაწუხოთ.'),
      jsonb_build_object('objection','დავფიქრდები','answer','რა ინფორმაცია დაგეხმარებათ გადაწყვეტილების მიღებაში — ფასი, გაყიდვის ვადა თუ შემდგომი პროცესი?')
    );
  else
    v_call_script := 'Здравствуйте, ' || coalesce(nullif(l.client_name,''),'') || '. '
      || case when l.status='new' then 'Вы оставляли заявку на оценку недвижимости. ' else 'Возвращаюсь к вашей заявке на оценку недвижимости. ' end
      || case when v_location is not null then 'Объект: '||v_location||'. ' else '' end
      || case when v_value is not null then 'Предварительная оценка — около '||v_value||'. ' else '' end
      || 'Хочу коротко уточнить: продажа объекта ещё актуальна? Какая цена и срок для вас комфортны?';

    v_whatsapp := 'Здравствуйте, ' || coalesce(nullif(l.client_name,''),'') || '! '
      || 'Пишу по вашей заявке на оценку недвижимости.'
      || case when v_location is not null then ' Объект: '||v_location||'.' else '' end
      || case when v_value is not null then ' Предварительная оценка — около '||v_value||'.' else '' end
      || ' Удобно коротко обсудить ваши планы по продаже и следующий шаг?';

    v_tip := case
      when v_gap is not null and v_gap >= 15 then 'Цена собственника заметно выше оценки. Не спорьте: покажите рыночные аргументы и предложите рабочий диапазон цены.'
      when v_gap is not null and v_gap <= -15 then 'Цена собственника ниже оценки. Уточните, не связана ли она со срочной продажей.'
      when coalesce(l.lead_score,0) >= 70 then 'Лид высокий по потенциалу — завершите разговор конкретным следующим шагом и датой.'
      else 'В конце разговора обязательно договоритесь о конкретном следующем шаге и времени.' end;

    v_points := jsonb_build_array(
      'Продажа объекта всё ещё актуальна?',
      'Какая цена комфортна собственнику?',
      'Насколько срочно нужно продать?',
      'Когда можно показать объект?',
      'Основные документы готовы?'
    );

    v_objections := jsonb_build_array(
      jsonb_build_object('objection','Цена слишком низкая','answer','Понимаю. Давайте сверим реальные рыночные данные и определим диапазон, в котором объект имеет лучшие шансы на продажу.'),
      jsonb_build_object('objection','Я пока не готов','answer','Хорошо. Давайте зафиксируем удобную дату, когда вернуться к вопросу, чтобы не беспокоить вас раньше времени.'),
      jsonb_build_object('objection','Я подумаю','answer','Что именно поможет принять решение: уточнение цены, срок продажи или понимание дальнейшего процесса?')
    );
  end if;

  return jsonb_build_object(
    'lead', jsonb_build_object(
      'id', l.id,
      'client_name', l.client_name,
      'phone', l.phone,
      'contact_method', l.contact_method,
      'language', l.language,
      'city', l.city,
      'address', l.address,
      'cadastral_code', l.cadastral_code,
      'estimated_value', l.estimated_value,
      'owner_price', l.owner_price,
      'status', l.status,
      'priority', l.priority,
      'follow_up_at', l.follow_up_at,
      'last_contact_at', l.last_contact_at,
      'lead_score', l.lead_score,
      'lead_grade', l.lead_grade
    ),
    'recommendation', jsonb_build_object(
      'urgency', v_urgency,
      'next_action', v_next_action,
      'recommended_channel', v_channel,
      'recommended_follow_up_minutes', v_follow_minutes,
      'recommended_follow_up_at', case when v_follow_minutes > 0 then now() + make_interval(mins=>v_follow_minutes) else null end,
      'price_gap_percent', v_gap,
      'manager_tip', v_tip
    ),
    'call_script', v_call_script,
    'whatsapp_text', v_whatsapp,
    'qualification_questions', v_points,
    'objections', v_objections,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.valuation_crm_manager_assistant_v51(uuid) from public, anon;
grant execute on function public.valuation_crm_manager_assistant_v51(uuid) to authenticated;

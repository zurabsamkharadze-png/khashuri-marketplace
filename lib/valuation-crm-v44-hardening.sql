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
  v_local_id text;
  v_city text;
  v_estimated numeric;
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

  if (select count(*) from public.valuation_referral_events e where e.owner_user_id=v_owner and e.created_at > now()-interval '1 hour') >= 120 then
    raise exception 'rate_limit';
  end if;

  v_local_id := nullif(left(trim(coalesce(v_payload->>'valuation_local_id','')),180),'');
  v_city := nullif(left(trim(coalesce(v_payload->>'city','')),120),'');
  v_estimated := case when coalesce(v_payload->>'estimated_value','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_payload->>'estimated_value')::numeric else null end;

  insert into public.valuation_referral_events(
    owner_user_id,event_type,event_key,valuation_local_id,city,estimated_value,payload
  ) values (
    v_owner,
    v_type,
    v_key,
    v_local_id,
    v_city,
    v_estimated,
    jsonb_strip_nulls(jsonb_build_object('valuation_local_id',v_local_id,'city',v_city,'estimated_value',v_estimated))
  )
  on conflict (owner_user_id,event_type,event_key) where event_key is not null do nothing;

  return true;
end;
$$;

revoke all on function public.track_valuation_referral_event(uuid,text,text,jsonb) from public;
grant execute on function public.track_valuation_referral_event(uuid,text,text,jsonb) to anon, authenticated;

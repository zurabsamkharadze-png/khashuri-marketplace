alter table public.valuation_leads
  add column if not exists manager_note text,
  add column if not exists priority text not null default 'normal',
  add column if not exists follow_up_at timestamptz,
  add column if not exists last_contact_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'valuation_leads_priority_check'
      and conrelid = 'public.valuation_leads'::regclass
  ) then
    alter table public.valuation_leads
      add constraint valuation_leads_priority_check
      check (priority in ('low','normal','high','urgent'));
  end if;
end $$;

create index if not exists valuation_leads_owner_priority_idx
  on public.valuation_leads(owner_user_id, priority, created_at desc);

create index if not exists valuation_leads_owner_follow_up_idx
  on public.valuation_leads(owner_user_id, follow_up_at)
  where follow_up_at is not null;

comment on column public.valuation_leads.manager_note is 'Private CRM note visible only to the lead owner through RLS';
comment on column public.valuation_leads.priority is 'CRM priority: low, normal, high, urgent';
comment on column public.valuation_leads.follow_up_at is 'Optional next follow-up date/time';
comment on column public.valuation_leads.last_contact_at is 'Last CRM contact timestamp';

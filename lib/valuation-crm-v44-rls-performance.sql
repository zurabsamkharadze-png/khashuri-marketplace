drop policy if exists "crm profile insert own" on public.valuation_crm_profiles;
create policy "crm profile insert own"
  on public.valuation_crm_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "crm profile read own" on public.valuation_crm_profiles;
create policy "crm profile read own"
  on public.valuation_crm_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "crm profile update own" on public.valuation_crm_profiles;
create policy "crm profile update own"
  on public.valuation_crm_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "crm leads read own" on public.valuation_leads;
create policy "crm leads read own"
  on public.valuation_leads
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "crm leads update own" on public.valuation_leads;
create policy "crm leads update own"
  on public.valuation_leads
  for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "crm leads delete own" on public.valuation_leads;
create policy "crm leads delete own"
  on public.valuation_leads
  for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);

-- V47 hardening: trigger function must not be callable as a public RPC.
-- PostgreSQL triggers continue to execute it normally.
revoke all on function public.valuation_crm_new_lead_notify_v47() from public;
revoke all on function public.valuation_crm_new_lead_notify_v47() from anon;
revoke all on function public.valuation_crm_new_lead_notify_v47() from authenticated;

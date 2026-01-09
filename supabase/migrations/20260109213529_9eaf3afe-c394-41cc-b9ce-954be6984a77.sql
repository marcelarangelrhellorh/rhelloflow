-- Fix Security Definer View issues by setting security_invoker=true
-- This ensures RLS policies are respected based on the querying user, not the view creator

-- Fix dashboard_overview view
ALTER VIEW public.dashboard_overview SET (security_invoker = true);

-- Fix vw_vaga_recrutadores view
ALTER VIEW public.vw_vaga_recrutadores SET (security_invoker = true);

-- Fix vw_vagas_com_stats view
ALTER VIEW public.vw_vagas_com_stats SET (security_invoker = true);
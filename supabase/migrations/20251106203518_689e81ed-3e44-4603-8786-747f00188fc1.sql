-- Set security_invoker=true on all views to use invoker's permissions
-- This ensures views respect the RLS policies for the querying user

ALTER VIEW public.audit_events_recent SET (security_invoker = true);
ALTER VIEW public.candidates_with_tags SET (security_invoker = true);
ALTER VIEW public.candidatos_active SET (security_invoker = true);
ALTER VIEW public.dashboard_last30 SET (security_invoker = true);
ALTER VIEW public.dashboard_overview SET (security_invoker = true);
ALTER VIEW public.feedbacks_active SET (security_invoker = true);
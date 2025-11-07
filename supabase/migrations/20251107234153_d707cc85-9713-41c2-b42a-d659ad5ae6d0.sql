-- Fix SECURITY DEFINER views by explicitly setting SECURITY INVOKER
-- The dashboard views don't have explicit security settings, which the linter flags

-- Update dashboard_last30 to explicitly use SECURITY INVOKER
ALTER VIEW public.dashboard_last30 SET (security_invoker = true);

-- Update dashboard_overview to explicitly use SECURITY INVOKER  
ALTER VIEW public.dashboard_overview SET (security_invoker = true);

-- Verify all public views now have explicit security settings
COMMENT ON VIEW public.dashboard_last30 IS 'Analytics view with SECURITY INVOKER - respects caller RLS policies';
COMMENT ON VIEW public.dashboard_overview IS 'Analytics view with SECURITY INVOKER - respects caller RLS policies';
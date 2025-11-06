-- Fix SECURITY DEFINER view access by controlling permissions
-- Views cannot have RLS enabled, so we control access via GRANT/REVOKE

-- Revoke broad access from all authenticated users
REVOKE SELECT ON public.dashboard_last30 FROM authenticated;
REVOKE SELECT ON public.dashboard_overview FROM authenticated;
REVOKE SELECT ON public.candidatos_active FROM authenticated;
REVOKE SELECT ON public.candidates_with_tags FROM authenticated;

-- Create a function to check if user has analytics access
CREATE OR REPLACE FUNCTION public.can_view_analytics()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'recrutador'::app_role, 'cs'::app_role)
  );
$$;

-- Create wrapper functions for each view with role checking
CREATE OR REPLACE FUNCTION public.get_dashboard_last30()
RETURNS SETOF public.dashboard_last30
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.dashboard_last30
  WHERE public.can_view_analytics();
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_overview()
RETURNS SETOF public.dashboard_overview
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.dashboard_overview
  WHERE public.can_view_analytics();
$$;

CREATE OR REPLACE FUNCTION public.get_candidatos_active()
RETURNS SETOF public.candidatos_active
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.candidatos_active
  WHERE (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_candidates_with_tags()
RETURNS SETOF public.candidates_with_tags
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.candidates_with_tags
  WHERE (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );
$$;

-- Grant EXECUTE permissions on the wrapper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_view_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_last30() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_candidatos_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_candidates_with_tags() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_dashboard_last30() IS 'Secure access to dashboard_last30 view - requires admin, recrutador, or cs role';
COMMENT ON FUNCTION public.get_dashboard_overview() IS 'Secure access to dashboard_overview view - requires admin, recrutador, or cs role';
COMMENT ON FUNCTION public.get_candidatos_active() IS 'Secure access to candidatos_active view - requires admin or recrutador role';
COMMENT ON FUNCTION public.get_candidates_with_tags() IS 'Secure access to candidates_with_tags view - requires admin or recrutador role';
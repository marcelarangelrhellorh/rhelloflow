-- =============================================
-- CORREÇÃO: Materialized View exposta na API
-- Revogar acesso público à mv_recruitment_kpis
-- =============================================

-- Revogar acesso do role anon (usuários não autenticados)
REVOKE ALL ON public.mv_recruitment_kpis FROM anon;

-- Manter acesso apenas para usuários autenticados com roles específicos
GRANT SELECT ON public.mv_recruitment_kpis TO authenticated;

-- Criar política de acesso via função (mais seguro)
CREATE OR REPLACE FUNCTION public.get_recruitment_kpis_secure()
RETURNS SETOF public.mv_recruitment_kpis
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_recruitment_kpis
  WHERE has_role(auth.uid(), 'admin'::app_role) 
     OR has_role(auth.uid(), 'recrutador'::app_role)
     OR has_role(auth.uid(), 'cs'::app_role);
$$;
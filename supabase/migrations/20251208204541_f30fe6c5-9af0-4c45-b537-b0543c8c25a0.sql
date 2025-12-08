-- ============================================
-- CORREÇÃO DOS AVISOS DO LINTER DE SEGURANÇA
-- ============================================

-- 1. REMOVER SECURITY DEFINER DA VIEW candidatos_public_view
-- A view não precisa de SECURITY DEFINER - deve usar RLS do usuário
-- ============================================

-- Recriar a view como view normal (sem security definer)
DROP VIEW IF EXISTS public.candidatos_public_view;

CREATE VIEW public.candidatos_public_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  nome_completo,
  nivel,
  area,
  status,
  vaga_relacionada_id,
  criado_em,
  cidade,
  estado,
  linkedin,
  curriculo_url,
  portfolio_url,
  pontos_fortes,
  pontos_desenvolver,
  parecer_final,
  disponibilidade_status,
  disponibilidade_mudanca,
  origem,
  is_visible_for_client,
  hired_at,
  deleted_at
FROM public.candidatos
WHERE deleted_at IS NULL;

-- Conceder acesso
GRANT SELECT ON public.candidatos_public_view TO authenticated;

-- 2. REVOGAR ACESSO PÚBLICO À MATERIALIZED VIEW mv_recruitment_kpis
-- ============================================

REVOKE ALL ON public.mv_recruitment_kpis FROM anon;
REVOKE ALL ON public.mv_recruitment_kpis FROM public;

-- Manter acesso apenas para authenticated
GRANT SELECT ON public.mv_recruitment_kpis TO authenticated;

-- 3. DOCUMENTAÇÃO
-- ============================================

COMMENT ON VIEW public.candidatos_public_view IS 
'View segura para clientes - omite dados sensíveis (telefone, email, salário). Usa security_invoker para respeitar RLS do usuário.';
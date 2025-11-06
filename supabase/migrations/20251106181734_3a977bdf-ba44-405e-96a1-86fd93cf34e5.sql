-- Recreate remaining views with SECURITY INVOKER to resolve all security definer warnings

-- 1. vw_candidato_rating - Candidate rating aggregation
CREATE OR REPLACE VIEW public.vw_candidato_rating
WITH (security_invoker = true)
AS
SELECT 
  f.candidato_id,
  ROUND(AVG(f.avaliacao)::numeric, 1) as media_rating,
  COUNT(*) FILTER (WHERE f.avaliacao IS NOT NULL) as qtd_avaliacoes,
  COUNT(*) as qtd_feedbacks
FROM public.feedbacks f
GROUP BY f.candidato_id;

-- 2. audit_events_recent - Recent audit events (last 90 days)
CREATE OR REPLACE VIEW public.audit_events_recent
WITH (security_invoker = true)
AS
SELECT * FROM public.audit_events
WHERE timestamp_utc >= NOW() - INTERVAL '90 days'
ORDER BY timestamp_utc DESC;

-- 3. vagas_active - Active (non-deleted) jobs
CREATE OR REPLACE VIEW public.vagas_active
WITH (security_invoker = true)
AS
SELECT * FROM public.vagas
WHERE deleted_at IS NULL;

-- 4. feedbacks_active - Active (non-deleted) feedbacks
CREATE OR REPLACE VIEW public.feedbacks_active
WITH (security_invoker = true)
AS
SELECT * FROM public.feedbacks
WHERE deleted_at IS NULL;

-- 5. vw_benchmark_recorte - Benchmark by market segment
CREATE OR REPLACE VIEW public.vw_benchmark_recorte
WITH (security_invoker = true)
AS
SELECT
  lower(funcao) as funcao_norm,
  senioridade,
  cidade,
  uf,
  setor,
  porte,
  avg(coalesce((resultado->'faixa_salarial'->'pleno'->>'med')::numeric, salario_cliente)) as media_salario_pleno,
  count(*) as qtd_estudos
FROM public.estudos
GROUP BY 1,2,3,4,5,6;

-- 6. view_candidate_tags - Candidate tags denormalized
CREATE OR REPLACE VIEW public.view_candidate_tags
WITH (security_invoker = true)
AS
SELECT 
  c.id AS candidate_id,
  t.id AS tag_id,
  t.label,
  t.category,
  ct.added_by,
  ct.added_at,
  ct.added_reason
FROM public.candidate_tags ct
JOIN public.tags t ON t.id = ct.tag_id
JOIN public.candidatos c ON c.id = ct.candidate_id;

-- Ensure all views have proper grants
GRANT SELECT ON public.vw_candidato_rating TO authenticated;
GRANT SELECT ON public.audit_events_recent TO authenticated;
GRANT SELECT ON public.vagas_active TO authenticated;
GRANT SELECT ON public.feedbacks_active TO authenticated;
GRANT SELECT ON public.vw_benchmark_recorte TO authenticated;
GRANT SELECT ON public.view_candidate_tags TO authenticated;

-- Add comments explaining security model
COMMENT ON VIEW public.vw_candidato_rating IS 'Candidate rating aggregation - respects RLS via security_invoker';
COMMENT ON VIEW public.audit_events_recent IS 'Recent audit events - respects RLS via security_invoker';
COMMENT ON VIEW public.vagas_active IS 'Active jobs only - respects RLS via security_invoker';
COMMENT ON VIEW public.feedbacks_active IS 'Active feedbacks only - respects RLS via security_invoker';
COMMENT ON VIEW public.vw_benchmark_recorte IS 'Market benchmark aggregation - respects RLS via security_invoker';
COMMENT ON VIEW public.view_candidate_tags IS 'Candidate tags denormalized - respects RLS via security_invoker';
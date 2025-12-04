-- Fix dashboard_overview view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies of the querying user are enforced

DROP VIEW IF EXISTS public.dashboard_overview;

CREATE VIEW public.dashboard_overview
WITH (security_invoker = true)
AS
SELECT 
  count(DISTINCT v.id) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')) AS vagas_abertas,
  count(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL) AS candidatos_ativos,
  0 AS vagas_atencao,
  ARRAY[]::uuid[] AS ids_vagas_atencao,
  round(avg(business_days_between(v.criado_em::date, now()::date))) AS media_dias_fechamento,
  round(
    (count(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado' AND c.deleted_at IS NULL))::numeric / 
    NULLIF(count(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL), 0)::numeric * 100, 
    2
  ) AS taxa_aprovacao,
  count(DISTINCT fr.id) FILTER (
    WHERE fr.expires_at > now() 
    AND NOT EXISTS (
      SELECT 1 FROM feedbacks f 
      WHERE f.request_id = fr.id AND f.deleted_at IS NULL
    )
  ) AS feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id
WHERE v.deleted_at IS NULL;
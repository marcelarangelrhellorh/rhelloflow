-- Ajustar dashboard_overview para considerar apenas feedbacks pendentes (sem resposta)
DROP VIEW IF EXISTS public.dashboard_overview CASCADE;
CREATE VIEW public.dashboard_overview AS
SELECT
  COUNT(DISTINCT v.id) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')) as vagas_abertas,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')) as candidatos_ativos,
  0 as vagas_atencao,
  ARRAY[]::uuid[] as ids_vagas_atencao,
  ROUND(AVG(public.business_days_between(v.criado_em::date, NOW()::date))::numeric) as media_dias_fechamento,
  ROUND(
    (COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado')::numeric / 
     NULLIF(COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')), 0)) * 100,
    2
  ) as taxa_aprovacao,
  -- Contar apenas feedback_requests que:
  -- 1. Ainda não expiraram (expires_at > NOW())
  -- 2. Não têm nenhum feedback respondido (não existe registro em feedbacks com esse request_id)
  COUNT(DISTINCT fr.id) FILTER (
    WHERE fr.expires_at > NOW() 
    AND NOT EXISTS (
      SELECT 1 FROM feedbacks f 
      WHERE f.request_id = fr.id 
      AND f.deleted_at IS NULL
    )
  ) as feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id;

-- Atualizar também dashboard_last30 para consistência
DROP VIEW IF EXISTS public.dashboard_last30 CASCADE;
CREATE VIEW public.dashboard_last30 AS
SELECT 
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado') as total_aprovados,
  ROUND(
    (COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado')::numeric / 
     NULLIF(COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')), 0)) * 100,
    2
  ) as taxa_aprovacao_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.criado_em - v.criado_em)) / 86400)::numeric) as tempo_medio_corridos,
  ROUND(AVG(public.business_days_between(v.criado_em::date, c.criado_em::date))::numeric) as tempo_medio_uteis,
  0 as vagas_reabertas,
  COUNT(DISTINCT fr.id) FILTER (
    WHERE fr.expires_at > NOW() 
    AND NOT EXISTS (
      SELECT 1 FROM feedbacks f 
      WHERE f.request_id = fr.id 
      AND f.deleted_at IS NULL
    )
  ) as feedbacks_pendentes,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')) as total_finalizados
FROM candidatos c
LEFT JOIN vagas v ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.candidato_id = c.id
WHERE c.criado_em >= NOW() - INTERVAL '30 days';

COMMENT ON VIEW dashboard_overview IS 'Dashboard overview with feedbacks_pendentes counting only unanswered feedback requests';
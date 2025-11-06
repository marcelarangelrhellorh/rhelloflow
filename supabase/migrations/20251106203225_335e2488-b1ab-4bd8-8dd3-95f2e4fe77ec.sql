-- Remove SECURITY DEFINER from views
-- The views themselves should not be SECURITY DEFINER
-- Access control is enforced through SECURITY DEFINER functions that wrap them

-- Recreate dashboard_last30 view without SECURITY DEFINER
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
  COUNT(DISTINCT fr.id) FILTER (WHERE fr.expires_at > NOW()) as feedbacks_pendentes,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')) as total_finalizados
FROM candidatos c
LEFT JOIN vagas v ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.candidato_id = c.id
WHERE c.criado_em >= NOW() - INTERVAL '30 days';

-- Recreate dashboard_overview view without SECURITY DEFINER
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
  COUNT(DISTINCT fr.id) FILTER (WHERE fr.expires_at > NOW()) as feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id;

-- Recreate candidatos_active view without SECURITY DEFINER
DROP VIEW IF EXISTS public.candidatos_active CASCADE;
CREATE VIEW public.candidatos_active AS
SELECT *
FROM candidatos
WHERE deleted_at IS NULL;

-- Recreate candidates_with_tags view without SECURITY DEFINER
DROP VIEW IF EXISTS public.candidates_with_tags CASCADE;
CREATE VIEW public.candidates_with_tags AS
SELECT 
  c.*,
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'id', t.id,
        'label', t.label,
        'category', t.category
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::jsonb
  ) as tags
FROM candidatos c
LEFT JOIN candidate_tags ct ON ct.candidate_id = c.id
LEFT JOIN tags t ON t.id = ct.tag_id AND t.active = true
WHERE c.deleted_at IS NULL
GROUP BY c.id;

-- Recreate feedbacks_active view without SECURITY DEFINER
DROP VIEW IF EXISTS public.feedbacks_active CASCADE;
CREATE VIEW public.feedbacks_active AS
SELECT *
FROM feedbacks
WHERE deleted_at IS NULL;

-- Recreate audit_events_recent view without SECURITY DEFINER
DROP VIEW IF EXISTS public.audit_events_recent CASCADE;
CREATE VIEW public.audit_events_recent AS
SELECT *
FROM audit_events
WHERE timestamp_utc >= NOW() - INTERVAL '30 days'
ORDER BY timestamp_utc DESC;
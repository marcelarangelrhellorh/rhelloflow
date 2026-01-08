-- Atualizar dashboard_overview para usar data_abertura em vez de criado_em
DROP VIEW IF EXISTS public.dashboard_overview;

CREATE OR REPLACE VIEW public.dashboard_overview AS
SELECT 
  count(DISTINCT v.id) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')) AS vagas_abertas,
  count(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL) AS candidatos_ativos,
  count(DISTINCT v.id) FILTER (
    WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')
    AND COALESCE(v.data_abertura, v.criado_em::date) < CURRENT_DATE - interval '30 days'
  ) AS vagas_atencao,
  ARRAY(
    SELECT v2.id 
    FROM vagas v2 
    WHERE v2.deleted_at IS NULL 
    AND v2.status_slug NOT IN ('concluida', 'cancelada', 'pausada')
    AND COALESCE(v2.data_abertura, v2.criado_em::date) < CURRENT_DATE - interval '30 days'
  ) AS ids_vagas_atencao,
  round(avg(business_days_between(COALESCE(v.data_abertura, v.criado_em::date), now()::date))) AS media_dias_fechamento,
  round(
    count(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado' AND c.deleted_at IS NULL)::numeric / 
    NULLIF(count(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL), 0)::numeric * 100, 
    2
  ) AS taxa_aprovacao,
  count(DISTINCT fr.id) FILTER (
    WHERE fr.expires_at > now() 
    AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.request_id = fr.id AND f.deleted_at IS NULL)
  ) AS feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id
WHERE v.deleted_at IS NULL;

-- Também atualizar a materialized view mv_dashboard_overview se existir
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_overview;

CREATE MATERIALIZED VIEW mv_dashboard_overview AS
SELECT 
  count(DISTINCT v.id) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')) AS vagas_abertas,
  count(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL) AS candidatos_ativos,
  count(DISTINCT v.id) FILTER (
    WHERE v.status_slug NOT IN ('concluida', 'cancelada', 'pausada')
    AND COALESCE(v.data_abertura, v.criado_em::date) < CURRENT_DATE - interval '30 days'
  ) AS vagas_atencao,
  ARRAY(
    SELECT v2.id 
    FROM vagas v2 
    WHERE v2.deleted_at IS NULL 
    AND v2.status_slug NOT IN ('concluida', 'cancelada', 'pausada')
    AND COALESCE(v2.data_abertura, v2.criado_em::date) < CURRENT_DATE - interval '30 days'
  ) AS ids_vagas_atencao,
  round(avg(business_days_between(COALESCE(v.data_abertura, v.criado_em::date), now()::date))) AS media_dias_fechamento,
  round(
    count(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado' AND c.deleted_at IS NULL)::numeric / 
    NULLIF(count(DISTINCT c.id) FILTER (WHERE c.status IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante') AND c.deleted_at IS NULL), 0)::numeric * 100, 
    2
  ) AS taxa_aprovacao,
  count(DISTINCT fr.id) FILTER (
    WHERE fr.expires_at > now() 
    AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.request_id = fr.id AND f.deleted_at IS NULL)
  ) AS feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id
WHERE v.deleted_at IS NULL;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_overview_unique_idx ON mv_dashboard_overview ((1));
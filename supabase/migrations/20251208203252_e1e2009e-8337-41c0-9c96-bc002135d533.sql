-- ===========================================
-- FASE 1: Views Otimizadas para eliminar N+1
-- ===========================================

-- View: vw_vagas_com_stats
-- Elimina o loop N+1 que busca contagem de candidatos e dias na etapa para cada vaga
CREATE OR REPLACE VIEW vw_vagas_com_stats AS
SELECT 
  v.id,
  v.titulo,
  v.empresa,
  v.recrutador,
  v.cs_responsavel,
  v.status,
  v.status_slug,
  v.status_order,
  v.complexidade,
  v.prioridade,
  v.criado_em,
  v.confidencial,
  v.recrutador_id,
  v.cs_id,
  v.deleted_at,
  v.salario_min,
  v.salario_max,
  v.modelo_trabalho,
  COALESCE(c.candidatos_count, 0)::integer AS candidatos_count,
  jsh.last_stage_change,
  CASE 
    WHEN jsh.last_stage_change IS NOT NULL THEN
      -- Calcular dias úteis desde última mudança de etapa
      (SELECT count(*)::integer
       FROM generate_series(jsh.last_stage_change::date, CURRENT_DATE, interval '1 day') d
       WHERE extract(isodow from d) < 6)
    ELSE 0
  END AS dias_etapa_atual
FROM vagas v
LEFT JOIN (
  SELECT vaga_relacionada_id, COUNT(*)::integer as candidatos_count
  FROM candidatos 
  WHERE deleted_at IS NULL
  GROUP BY vaga_relacionada_id
) c ON c.vaga_relacionada_id = v.id
LEFT JOIN LATERAL (
  SELECT changed_at as last_stage_change
  FROM job_stage_history
  WHERE job_id = v.id
  ORDER BY changed_at DESC
  LIMIT 1
) jsh ON true;

-- View: vw_candidatos_reprovados_sem_whatsapp
-- Elimina as múltiplas queries para encontrar candidatos reprovados sem mensagem
CREATE OR REPLACE VIEW vw_candidatos_reprovados_sem_whatsapp AS
SELECT 
  c.id,
  c.nome_completo,
  c.telefone,
  c.email,
  c.status,
  c.criado_em,
  c.vaga_relacionada_id,
  v.titulo as vaga_titulo,
  -- Calcular dias desde status
  (CURRENT_DATE - c.criado_em::date)::integer AS dias_desde_status
FROM candidatos c
LEFT JOIN vagas v ON v.id = c.vaga_relacionada_id AND v.deleted_at IS NULL
LEFT JOIN whatsapp_sends ws ON ws.candidate_id = c.id AND ws.template_key = 'reprovacao'
WHERE c.status IN ('Reprovado rhello', 'Reprovado Solicitante')
  AND c.deleted_at IS NULL
  AND ws.id IS NULL
ORDER BY c.criado_em DESC;

-- ===========================================
-- FASE 2: Índices Compostos para Performance
-- ===========================================

-- Índice para candidatos por vaga (usado em múltiplas páginas)
CREATE INDEX IF NOT EXISTS idx_candidatos_vaga_status_deleted 
ON candidatos(vaga_relacionada_id, status) WHERE deleted_at IS NULL;

-- Índice para vagas ativas (listagem principal)
CREATE INDEX IF NOT EXISTS idx_vagas_status_slug_deleted 
ON vagas(status_slug, criado_em DESC) WHERE deleted_at IS NULL;

-- Índice para tasks por vaga (página de detalhes)
CREATE INDEX IF NOT EXISTS idx_tasks_vaga_status_due 
ON tasks(vaga_id, status, due_date) WHERE status != 'done';

-- Índice para WhatsApp sends por candidato e template
CREATE INDEX IF NOT EXISTS idx_whatsapp_candidate_template 
ON whatsapp_sends(candidate_id, template_key);

-- Índice para job stage history ordenado
CREATE INDEX IF NOT EXISTS idx_job_stage_history_job_changed_desc 
ON job_stage_history(job_id, changed_at DESC);

-- Índice para candidatos ativos sem WhatsApp
CREATE INDEX IF NOT EXISTS idx_candidatos_status_deleted
ON candidatos(status) WHERE deleted_at IS NULL;

-- ===========================================
-- FASE 3: Materialized View para Dashboard
-- ===========================================

-- Criar materialized view para dashboard (mais rápido que view normal)
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_overview;

CREATE MATERIALIZED VIEW mv_dashboard_overview AS
WITH vagas_stats AS (
  SELECT 
    count(*) FILTER (WHERE status_slug NOT IN ('concluida', 'cancelada', 'pausada')) AS vagas_abertas,
    count(*) FILTER (WHERE status_slug = 'cancelada') AS vagas_canceladas,
    array_agg(id) FILTER (
      WHERE status_slug NOT IN ('concluida', 'cancelada', 'pausada')
      AND criado_em < CURRENT_DATE - interval '30 days'
    ) AS ids_vagas_atencao
  FROM vagas
  WHERE deleted_at IS NULL
),
candidatos_stats AS (
  SELECT 
    count(*) FILTER (WHERE status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')) AS candidatos_ativos
  FROM candidatos
  WHERE deleted_at IS NULL
),
feedbacks_stats AS (
  SELECT count(DISTINCT fr.id) AS feedbacks_pendentes
  FROM feedback_requests fr
  LEFT JOIN feedbacks f ON f.request_id = fr.id
  WHERE fr.expires_at > now() AND f.id IS NULL
),
tempo_stats AS (
  SELECT 
    COALESCE(
      avg(
        EXTRACT(epoch FROM (jsh_final.changed_at - v.criado_em)) / 86400
      )::numeric,
      0
    ) AS media_dias_fechamento,
    CASE 
      WHEN count(*) FILTER (WHERE v.status_slug = 'concluida') > 0 THEN
        (count(*) FILTER (WHERE v.status_slug = 'concluida' AND EXISTS (
          SELECT 1 FROM candidatos c 
          WHERE c.vaga_relacionada_id = v.id 
          AND c.status = 'Contratado'
        ))::numeric / count(*) FILTER (WHERE v.status_slug = 'concluida')::numeric) * 100
      ELSE 0
    END AS taxa_aprovacao
  FROM vagas v
  LEFT JOIN LATERAL (
    SELECT changed_at 
    FROM job_stage_history 
    WHERE job_id = v.id AND to_status = 'Concluída'
    ORDER BY changed_at DESC 
    LIMIT 1
  ) jsh_final ON true
  WHERE v.deleted_at IS NULL
    AND v.criado_em >= CURRENT_DATE - interval '30 days'
)
SELECT 
  vs.vagas_abertas::integer,
  cs.candidatos_ativos::integer,
  COALESCE(array_length(vs.ids_vagas_atencao, 1), 0)::integer AS vagas_atencao,
  COALESCE(vs.ids_vagas_atencao, ARRAY[]::uuid[]) AS ids_vagas_atencao,
  ROUND(ts.media_dias_fechamento, 1)::numeric AS media_dias_fechamento,
  ROUND(ts.taxa_aprovacao, 1)::numeric AS taxa_aprovacao,
  fs.feedbacks_pendentes::integer
FROM vagas_stats vs, candidatos_stats cs, feedbacks_stats fs, tempo_stats ts;

-- Índice único para permitir refresh concurrently
CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_overview_idx ON mv_dashboard_overview (vagas_abertas);

-- RLS para a materialized view (via função)
CREATE OR REPLACE FUNCTION get_dashboard_overview_secure()
RETURNS TABLE (
  vagas_abertas integer,
  candidatos_ativos integer,
  vagas_atencao integer,
  ids_vagas_atencao uuid[],
  media_dias_fechamento numeric,
  taxa_aprovacao numeric,
  feedbacks_pendentes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM mv_dashboard_overview
  WHERE has_role(auth.uid(), 'admin'::app_role) 
     OR has_role(auth.uid(), 'recrutador'::app_role)
     OR has_role(auth.uid(), 'cs'::app_role);
$$;

-- Função para refresh da materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_overview;
END;
$$;
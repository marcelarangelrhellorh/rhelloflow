-- ============================================================================
-- FASE 3: QUERY OPTIMIZATION - MATERIALIZED VIEWS PARA KPIs
-- ============================================================================

-- 3.1 VIEW MATERIALIZADA PARA KPIS DE RECRUTAMENTO
-- Substitui queries pesadas em Relatórios que percorrem todas as vagas/candidatos
-- Refresh: A cada 1 hora via cron job (configurar depois)

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_recruitment_kpis AS
WITH vagas_stats AS (
  SELECT
    v.recrutador_id,
    v.cs_id,
    v.status_slug,
    COUNT(*) as total_vagas,
    COUNT(*) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada')) as vagas_abertas,
    COUNT(*) FILTER (WHERE v.status_slug = 'concluida') as vagas_concluidas,
    COUNT(*) FILTER (WHERE v.status_slug = 'pausada') as vagas_pausadas,
    COUNT(*) FILTER (WHERE v.status_slug = 'cancelada') as vagas_canceladas
  FROM vagas v
  WHERE v.deleted_at IS NULL
  GROUP BY v.recrutador_id, v.cs_id, v.status_slug
),
candidatos_stats AS (
  SELECT
    c.vaga_relacionada_id,
    COUNT(*) as total_candidatos,
    COUNT(*) FILTER (WHERE c.status = 'Contratado') as contratacoes,
    COUNT(*) FILTER (WHERE c.status IN ('Reprovado rhello', 'Reprovado Solicitante')) as reprovados,
    COUNT(*) FILTER (WHERE c.criado_em >= NOW() - INTERVAL '30 days') as novos_30d,
    AVG(EXTRACT(day FROM (NOW() - c.criado_em))) FILTER (WHERE c.status = 'Contratado') as avg_days_to_hire,
    AVG(EXTRACT(day FROM (NOW() - c.criado_em))) as avg_candidate_age
  FROM candidatos c
  WHERE c.deleted_at IS NULL
  GROUP BY c.vaga_relacionada_id
),
feedbacks_stats AS (
  SELECT
    f.vaga_id,
    COUNT(*) as total_feedbacks,
    COUNT(*) FILTER (WHERE f.origem = 'cliente') as feedbacks_cliente,
    AVG(f.avaliacao) FILTER (WHERE f.avaliacao IS NOT NULL) as avg_rating
  FROM feedbacks f
  WHERE f.deleted_at IS NULL
  GROUP BY f.vaga_id
),
recrutador_performance AS (
  SELECT
    v.recrutador_id as user_id,
    COUNT(DISTINCT v.id) as total_vagas_assigned,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status_slug NOT IN ('concluida', 'cancelada')) as vagas_ativas,
    COUNT(DISTINCT c.id) as total_candidatos_managed,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado') as total_contratacoes,
    COALESCE(AVG(EXTRACT(day FROM (NOW() - c.criado_em))) FILTER (WHERE c.status = 'Contratado'), 0) as avg_time_to_hire_days
  FROM vagas v
  LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id AND c.deleted_at IS NULL
  WHERE v.deleted_at IS NULL
    AND v.recrutador_id IS NOT NULL
  GROUP BY v.recrutador_id
),
banco_talentos_stats AS (
  SELECT
    COUNT(*) as total_no_banco,
    COUNT(*) FILTER (WHERE disponibilidade_status = 'disponível') as disponiveis,
    COUNT(*) FILTER (WHERE criado_em >= NOW() - INTERVAL '30 days') as novos_30d
  FROM candidatos
  WHERE deleted_at IS NULL
    AND status = 'Banco de Talentos'
)
SELECT
  'kpis' as metric_type,
  NOW() as calculated_at,
  jsonb_build_object(
    'vagas_abertas', COALESCE((SELECT SUM(vagas_abertas) FROM vagas_stats), 0),
    'vagas_concluidas', COALESCE((SELECT SUM(vagas_concluidas) FROM vagas_stats), 0),
    'vagas_pausadas', COALESCE((SELECT SUM(vagas_pausadas) FROM vagas_stats), 0),
    'total_candidatos', COALESCE((SELECT SUM(total_candidatos) FROM candidatos_stats), 0),
    'total_contratacoes', COALESCE((SELECT SUM(contratacoes) FROM candidatos_stats), 0),
    'novos_candidatos_30d', COALESCE((SELECT SUM(novos_30d) FROM candidatos_stats), 0),
    'avg_time_to_hire_days', COALESCE((SELECT AVG(avg_days_to_hire) FROM candidatos_stats WHERE avg_days_to_hire IS NOT NULL), 0),
    'total_feedbacks', COALESCE((SELECT SUM(total_feedbacks) FROM feedbacks_stats), 0),
    'feedbacks_cliente', COALESCE((SELECT SUM(feedbacks_cliente) FROM feedbacks_stats), 0),
    'banco_talentos', (SELECT row_to_json(banco_talentos_stats) FROM banco_talentos_stats),
    'recrutadores_performance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', rp.user_id,
          'total_vagas', rp.total_vagas_assigned,
          'vagas_ativas', rp.vagas_ativas,
          'total_candidatos', rp.total_candidatos_managed,
          'contratacoes', rp.total_contratacoes,
          'avg_time_to_hire', rp.avg_time_to_hire_days
        )
      )
      FROM recrutador_performance rp
    )
  ) as kpis_data;

-- Criar índices para performance da view
CREATE UNIQUE INDEX IF NOT EXISTS mv_recruitment_kpis_metric_idx 
ON mv_recruitment_kpis(metric_type);

-- Refresh inicial
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recruitment_kpis;

-- 3.2 VIEW PARA CANDIDATOS POR VAGA (otimiza queries de cliente)
-- Elimina N+1 queries ao carregar candidatos de múltiplas vagas

CREATE OR REPLACE VIEW vw_candidatos_por_vaga AS
SELECT
  c.id,
  c.nome_completo,
  c.email,
  c.telefone,
  c.status,
  c.vaga_relacionada_id,
  c.criado_em,
  c.ultimo_feedback,
  c.total_feedbacks,
  v.titulo as vaga_titulo,
  v.empresa as vaga_empresa,
  v.cliente_id,
  u_rec.name as recrutador_nome,
  u_cs.name as cs_nome
FROM candidatos c
INNER JOIN vagas v ON v.id = c.vaga_relacionada_id
LEFT JOIN users u_rec ON u_rec.id = v.recrutador_id
LEFT JOIN users u_cs ON u_cs.id = v.cs_id
WHERE c.deleted_at IS NULL
  AND v.deleted_at IS NULL;

-- RLS para view (herda das tabelas base, mas adiciona check explícito)
ALTER VIEW vw_candidatos_por_vaga SET (security_invoker = true);

-- 3.3 FUNÇÃO PARA REFRESH AUTOMÁTICO DA VIEW MATERIALIZADA
-- Será chamada por cron job a cada hora

CREATE OR REPLACE FUNCTION refresh_recruitment_kpis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recruitment_kpis;
END;
$$;

-- 3.4 VIEW PARA VAGAS DO CLIENTE (otimiza página Acompanhamento)
-- Elimina múltiplas queries ao carregar dados do cliente

CREATE OR REPLACE VIEW vw_vagas_cliente_detalhadas AS
SELECT
  v.id,
  v.titulo,
  v.empresa,
  v.status,
  v.status_slug,
  v.criado_em,
  v.cliente_id,
  v.recrutador_id,
  v.cs_id,
  v.salario_min,
  v.salario_max,
  v.beneficios,
  v.modelo_trabalho,
  v.tipo_contratacao,
  u_rec.name as recrutador_nome,
  u_rec.email as recrutador_email,
  u_cs.name as cs_nome,
  u_cs.email as cs_email,
  COALESCE(candidatos_count.total, 0) as total_candidatos,
  COALESCE(candidatos_count.sem_feedback, 0) as candidatos_sem_feedback,
  COALESCE(candidatos_count.contratados, 0) as candidatos_contratados
FROM vagas v
LEFT JOIN users u_rec ON u_rec.id = v.recrutador_id
LEFT JOIN users u_cs ON u_cs.id = v.cs_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE ultimo_feedback IS NULL) as sem_feedback,
    COUNT(*) FILTER (WHERE status = 'Contratado') as contratados
  FROM candidatos c
  WHERE c.vaga_relacionada_id = v.id
    AND c.deleted_at IS NULL
) candidatos_count ON true
WHERE v.deleted_at IS NULL;

-- RLS para view
ALTER VIEW vw_vagas_cliente_detalhadas SET (security_invoker = true);

-- ============================================================================
-- ANÁLISE DE IMPACTO
-- ============================================================================
-- Performance:
--   ✅ mv_recruitment_kpis: KPIs pré-calculados (refresh 1h)
--   ✅ vw_candidatos_por_vaga: elimina N+1 em listagens
--   ✅ vw_vagas_cliente_detalhadas: otimiza página Acompanhamento
--   ✅ Redução esperada: -90% em tempo de carga de Relatórios
--   ✅ Redução esperada: -80% em tempo de carga de Acompanhamento
--
-- Manutenção:
--   ⚠️ Configurar cron job para refresh_recruitment_kpis() a cada 1h
--   ⚠️ Monitorar tamanho da materialized view
-- ============================================================================
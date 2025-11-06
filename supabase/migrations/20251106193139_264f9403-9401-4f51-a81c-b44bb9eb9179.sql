-- Fix dashboard_overview view to use correct status slugs
CREATE OR REPLACE VIEW dashboard_overview AS
WITH params AS (
  SELECT 
    NOW() - INTERVAL '30 days' AS dt_from,
    NOW() AS dt_to
),
vagas_abertas AS (
  SELECT COUNT(*)::INTEGER AS vagas_abertas
  FROM vagas
  WHERE status_slug NOT IN ('concluida', 'cancelada')
    AND deleted_at IS NULL
),
candidatos_ativos AS (
  SELECT COUNT(*)::INTEGER AS candidatos_ativos
  FROM candidatos
  WHERE status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')
),
dias AS (
  SELECT generate_series(
    (NOW() - INTERVAL '90 days')::DATE::TIMESTAMP,
    NOW()::DATE::TIMESTAMP,
    INTERVAL '1 day'
  )::DATE AS d
),
uteis AS (
  SELECT d
  FROM dias
  WHERE EXTRACT(ISODOW FROM d) < 6
),
vagas_uteis AS (
  SELECT 
    v.id,
    COUNT(u.d)::INTEGER AS dias_uteis_aberta
  FROM vagas v
  JOIN uteis u ON u.d >= v.criado_em::DATE AND u.d <= NOW()::DATE
  WHERE v.status_slug NOT IN ('concluida', 'cancelada')
    AND v.deleted_at IS NULL
  GROUP BY v.id
),
atencao AS (
  SELECT 
    COUNT(*)::INTEGER AS vagas_atencao,
    COALESCE(
      ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL),
      ARRAY[]::UUID[]
    ) AS ids_vagas_atencao
  FROM vagas_uteis
  WHERE dias_uteis_aberta > 30
),
tempo_fechamento AS (
  SELECT COALESCE(
    AVG(EXTRACT(DAY FROM status_changed_at - criado_em))::INTEGER,
    0
  ) AS media_dias_fechamento
  FROM vagas v, params p
  WHERE v.status_slug = 'concluida'
    AND v.status_changed_at >= p.dt_from
    AND v.status_changed_at <= p.dt_to
    AND v.deleted_at IS NULL
),
taxa_aprovacao AS (
  SELECT COALESCE(
    ROUND(
      100.0 * SUM(CASE WHEN h.resultado = 'Contratado' THEN 1 ELSE 0 END)::NUMERIC
      / NULLIF(COUNT(*), 0)::NUMERIC,
      1
    ),
    0
  ) AS taxa_aprovacao
  FROM historico_candidatos h, params p
  WHERE h.data >= p.dt_from
    AND h.data <= p.dt_to
    AND h.resultado IN ('Aprovado', 'Reprovado', 'Contratado')
),
feedbacks_pendentes AS (
  SELECT COUNT(*)::INTEGER AS feedbacks_pendentes
  FROM candidatos c
  WHERE c.status = 'Entrevistas Solicitante'
    AND NOT EXISTS (
      SELECT 1
      FROM feedbacks f
      WHERE f.candidato_id = c.id
        AND f.tipo = 'cliente'
        AND f.criado_em >= c.ultimo_feedback
    )
)
SELECT 
  va.vagas_abertas,
  ca.candidatos_ativos,
  at.vagas_atencao,
  at.ids_vagas_atencao,
  tf.media_dias_fechamento,
  ta.taxa_aprovacao,
  fp.feedbacks_pendentes
FROM vagas_abertas va, candidatos_ativos ca, atencao at,
     tempo_fechamento tf, taxa_aprovacao ta, feedbacks_pendentes fp;
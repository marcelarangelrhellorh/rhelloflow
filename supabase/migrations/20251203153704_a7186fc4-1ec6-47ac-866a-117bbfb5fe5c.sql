-- Corrigir view dashboard_overview para filtrar vagas e candidatos deletados
CREATE OR REPLACE VIEW dashboard_overview AS
SELECT 
  count(DISTINCT v.id) FILTER (WHERE v.status_slug <> ALL (ARRAY['concluida'::text, 'cancelada'::text, 'pausada'::text])) AS vagas_abertas,
  count(DISTINCT c.id) FILTER (WHERE c.status <> ALL (ARRAY['Contratado'::status_candidato, 'Reprovado rhello'::status_candidato, 'Reprovado Solicitante'::status_candidato]) AND c.deleted_at IS NULL) AS candidatos_ativos,
  0 AS vagas_atencao,
  ARRAY[]::uuid[] AS ids_vagas_atencao,
  round(avg(business_days_between(v.criado_em::date, now()::date))) AS media_dias_fechamento,
  round(count(DISTINCT c.id) FILTER (WHERE c.status = 'Contratado'::status_candidato AND c.deleted_at IS NULL)::numeric / NULLIF(count(DISTINCT c.id) FILTER (WHERE c.status = ANY (ARRAY['Contratado'::status_candidato, 'Reprovado rhello'::status_candidato, 'Reprovado Solicitante'::status_candidato]) AND c.deleted_at IS NULL), 0)::numeric * 100::numeric, 2) AS taxa_aprovacao,
  count(DISTINCT fr.id) FILTER (WHERE fr.expires_at > now() AND NOT (EXISTS ( SELECT 1
         FROM feedbacks f
        WHERE f.request_id = fr.id AND f.deleted_at IS NULL))) AS feedbacks_pendentes
FROM vagas v
LEFT JOIN candidatos c ON c.vaga_relacionada_id = v.id
LEFT JOIN feedback_requests fr ON fr.vaga_id = v.id
WHERE v.deleted_at IS NULL;
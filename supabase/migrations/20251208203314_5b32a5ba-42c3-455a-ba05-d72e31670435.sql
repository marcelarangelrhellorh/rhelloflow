-- Corrigir Security Definer Views convertendo para SECURITY INVOKER
-- Isso garante que as permissões RLS do usuário atual sejam respeitadas

-- Drop and recreate vw_vagas_com_stats with SECURITY INVOKER
DROP VIEW IF EXISTS vw_vagas_com_stats;

CREATE VIEW vw_vagas_com_stats 
WITH (security_invoker = true)
AS
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

-- Drop and recreate vw_candidatos_reprovados_sem_whatsapp with SECURITY INVOKER
DROP VIEW IF EXISTS vw_candidatos_reprovados_sem_whatsapp;

CREATE VIEW vw_candidatos_reprovados_sem_whatsapp
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.nome_completo,
  c.telefone,
  c.email,
  c.status,
  c.criado_em,
  c.vaga_relacionada_id,
  v.titulo as vaga_titulo,
  (CURRENT_DATE - c.criado_em::date)::integer AS dias_desde_status
FROM candidatos c
LEFT JOIN vagas v ON v.id = c.vaga_relacionada_id AND v.deleted_at IS NULL
LEFT JOIN whatsapp_sends ws ON ws.candidate_id = c.id AND ws.template_key = 'reprovacao'
WHERE c.status IN ('Reprovado rhello', 'Reprovado Solicitante')
  AND c.deleted_at IS NULL
  AND ws.id IS NULL
ORDER BY c.criado_em DESC;

-- Revogar acesso direto à materialized view e forçar uso via função segura
REVOKE ALL ON mv_dashboard_overview FROM anon, authenticated;

-- Mover materialized view para schema privado (se não existir, criar)
-- Na verdade, vamos apenas revogar acesso público
REVOKE SELECT ON mv_dashboard_overview FROM public;
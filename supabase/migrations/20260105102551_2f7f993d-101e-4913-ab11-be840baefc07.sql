-- Corrigir a view para usar SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS vw_candidatos_reprovados_sem_whatsapp;

CREATE VIEW vw_candidatos_reprovados_sem_whatsapp 
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.nome_completo,
  c.telefone,
  c.email,
  c.status,
  c.criado_em,
  c.vaga_relacionada_id,
  v.titulo AS vaga_titulo,
  (CURRENT_DATE - c.criado_em::date) AS dias_desde_status,
  c.rejection_feedback_given,
  c.rejection_feedback_at,
  c.rejection_feedback_job_id
FROM candidatos c
LEFT JOIN vagas v ON v.id = c.vaga_relacionada_id AND v.deleted_at IS NULL
WHERE 
  c.status IN ('Reprovado rhello', 'Reprovado Solicitante')
  AND c.deleted_at IS NULL
  AND (c.rejection_feedback_given = false OR c.rejection_feedback_given IS NULL)
ORDER BY c.criado_em DESC;
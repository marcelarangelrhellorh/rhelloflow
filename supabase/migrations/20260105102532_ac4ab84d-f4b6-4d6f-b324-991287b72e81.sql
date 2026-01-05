-- 1. Adicionar campos de retorno ao candidato reprovado
ALTER TABLE candidatos 
ADD COLUMN IF NOT EXISTS rejection_feedback_given BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_feedback_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_feedback_job_id UUID REFERENCES vagas(id);

-- Index para performance do KPI
CREATE INDEX IF NOT EXISTS idx_candidatos_rejection_feedback 
ON candidatos(status, rejection_feedback_given) 
WHERE deleted_at IS NULL;

-- 2. Criar tabela de controle de notificações de vagas paradas
CREATE TABLE IF NOT EXISTS job_stage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  stage_slug TEXT NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  
  UNIQUE(job_id, stage_slug)
);

ALTER TABLE job_stage_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies para job_stage_notifications
CREATE POLICY "Users can view their own notifications"
ON job_stage_notifications FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON job_stage_notifications FOR INSERT
WITH CHECK (true);

-- 3. Atualizar view de reprovados sem retorno
DROP VIEW IF EXISTS vw_candidatos_reprovados_sem_whatsapp;

CREATE VIEW vw_candidatos_reprovados_sem_whatsapp AS
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
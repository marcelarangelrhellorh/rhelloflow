-- Add 'feedback_solicitado' to allowed notification kinds (with existing values)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check 
  CHECK (kind IN (
    'vaga',
    'etapa_vaga',
    'candidatura_externa',
    'feedback_solicitado'
  ));
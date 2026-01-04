-- Add 'teste_tecnico' to allowed notification kinds
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check 
CHECK (kind = ANY (ARRAY['vaga', 'etapa_vaga', 'candidatura_externa', 'feedback_solicitado', 'teste_tecnico']));
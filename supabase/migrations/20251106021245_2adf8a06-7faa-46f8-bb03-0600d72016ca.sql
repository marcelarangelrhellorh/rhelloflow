-- Atualizar constraint para incluir mais tipos de notificação
ALTER TABLE public.notifications 
DROP CONSTRAINT notifications_kind_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_kind_check 
CHECK (kind IN (
  'stage_age_threshold',
  'no_activity',
  'custom',
  'vaga',
  'etapa_vaga',
  'candidatura_externa'
));
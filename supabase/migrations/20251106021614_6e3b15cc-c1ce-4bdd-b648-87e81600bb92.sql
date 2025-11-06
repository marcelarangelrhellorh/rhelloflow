-- Otimizações de performance

-- 1. Adicionar índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_vagas_status_slug ON public.vagas(status_slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vagas_source ON public.vagas(source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vagas_recrutador_id ON public.vagas(recrutador_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vagas_cs_id ON public.vagas(cs_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_candidatos_status ON public.candidatos(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_candidatos_vaga_id ON public.candidatos(vaga_relacionada_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 2. Otimizar trigger de notificação para vagas externas (torná-lo mais eficiente)
CREATE OR REPLACE FUNCTION public.notifica_vaga_externa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_count INT;
BEGIN
  -- Só processar se for vaga externa
  IF NEW.source = 'externo' THEN
    -- Criar notificações diretamente em uma única query (mais rápido)
    INSERT INTO public.notifications (user_id, kind, title, body, job_id)
    SELECT 
      p.id,
      'vaga',
      'Vaga criada via formulário externo',
      format('A vaga "%s" foi criada externamente e precisa de campos de recrutamento preenchidos', NEW.titulo),
      NEW.id
    FROM user_roles ur
    INNER JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('admin', 'recrutador')
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    RAISE LOG 'Created % notifications for external job %', v_notification_count, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Otimizar trigger de mudança de status (reduzir overhead)
CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só notificar se o status mudou E se há recrutador/cs atribuído
  IF OLD.status_slug IS DISTINCT FROM NEW.status_slug 
     AND (NEW.recrutador_id IS NOT NULL OR NEW.cs_id IS NOT NULL) THEN
    
    -- Criar notificações diretamente
    INSERT INTO public.notifications (user_id, kind, title, body, job_id)
    SELECT DISTINCT unnest(ARRAY[NEW.recrutador_id, NEW.cs_id]),
           'etapa_vaga',
           format('Vaga "%s" mudou de etapa', NEW.titulo),
           format('Status alterado para: %s', NEW.status),
           NEW.id
    WHERE unnest(ARRAY[NEW.recrutador_id, NEW.cs_id]) IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
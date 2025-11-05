-- Deprecar tabela notificacoes antiga (sem user_id)
-- Manter por enquanto para não quebrar código existente, mas marcar como deprecated
COMMENT ON TABLE public.notificacoes IS 'DEPRECATED: Use public.notifications instead. This table lacks user_id and should not be used for new code.';

-- Garantir que a tabela notifications tenha Realtime habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

-- Criar função helper para criar notificações
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_kind TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    kind,
    title,
    body,
    job_id
  ) VALUES (
    p_user_id,
    p_kind,
    p_title,
    p_body,
    p_job_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Criar função para notificar múltiplos usuários
CREATE OR REPLACE FUNCTION public.create_notifications_for_users(
  p_user_ids UUID[],
  p_kind TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    PERFORM create_notification(v_user_id, p_kind, p_title, p_body, p_job_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Criar trigger para notificar quando candidato se inscreve via share link
CREATE OR REPLACE FUNCTION public.notify_new_share_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vaga RECORD;
  v_share_link RECORD;
  v_user_ids UUID[];
BEGIN
  -- Só processar se veio de share link
  IF NEW.source_link_id IS NOT NULL THEN
    -- Buscar informações da vaga e share link
    SELECT v.id, v.titulo, v.empresa, v.recrutador_id, v.cs_id, sl.id as link_id
    INTO v_vaga
    FROM vagas v
    LEFT JOIN share_links sl ON sl.id = NEW.source_link_id
    WHERE v.id = NEW.vaga_relacionada_id;
    
    IF v_vaga.id IS NOT NULL THEN
      -- Coletar IDs dos usuários a notificar (recrutador e CS)
      v_user_ids := ARRAY[]::UUID[];
      
      IF v_vaga.recrutador_id IS NOT NULL THEN
        v_user_ids := array_append(v_user_ids, v_vaga.recrutador_id);
      END IF;
      
      IF v_vaga.cs_id IS NOT NULL AND v_vaga.cs_id != v_vaga.recrutador_id THEN
        v_user_ids := array_append(v_user_ids, v_vaga.cs_id);
      END IF;
      
      -- Criar notificações para os usuários
      IF array_length(v_user_ids, 1) > 0 THEN
        PERFORM create_notifications_for_users(
          v_user_ids,
          'candidatura_externa',
          'Nova candidatura via link de divulgação',
          format('%s se candidatou para %s via link público', NEW.nome_completo, v_vaga.titulo),
          v_vaga.id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_share_application ON public.candidatos;
CREATE TRIGGER trigger_notify_share_application
AFTER INSERT ON public.candidatos
FOR EACH ROW
EXECUTE FUNCTION notify_new_share_application();

-- Criar função para notificar mudança de etapa de vaga
CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status_slug IS DISTINCT FROM NEW.status_slug THEN
    v_user_ids := ARRAY[]::UUID[];
    
    IF NEW.recrutador_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, NEW.recrutador_id);
    END IF;
    
    IF NEW.cs_id IS NOT NULL AND NEW.cs_id != NEW.recrutador_id THEN
      v_user_ids := array_append(v_user_ids, NEW.cs_id);
    END IF;
    
    IF array_length(v_user_ids, 1) > 0 THEN
      PERFORM create_notifications_for_users(
        v_user_ids,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para mudança de etapa
DROP TRIGGER IF EXISTS trigger_notify_job_stage ON public.vagas;
CREATE TRIGGER trigger_notify_job_stage
AFTER UPDATE ON public.vagas
FOR EACH ROW
EXECUTE FUNCTION notify_job_stage_change();

-- Comentários nas funções
COMMENT ON FUNCTION public.create_notification IS 'Helper function to create a notification for a single user';
COMMENT ON FUNCTION public.create_notifications_for_users IS 'Helper function to create notifications for multiple users at once';
COMMENT ON FUNCTION public.notify_new_share_application IS 'Trigger function to notify recruiters when a candidate applies via share link';
COMMENT ON FUNCTION public.notify_job_stage_change IS 'Trigger function to notify team members when a job stage changes';
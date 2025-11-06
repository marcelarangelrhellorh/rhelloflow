-- Criar função para notificar sobre novo feedback
CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_candidato RECORD;
  v_vaga RECORD;
  v_user_ids UUID[];
BEGIN
  -- Buscar informações do candidato
  SELECT c.id, c.nome_completo, c.vaga_relacionada_id
  INTO v_candidato
  FROM candidatos c
  WHERE c.id = NEW.candidato_id;
  
  -- Se o candidato tem vaga relacionada, buscar recrutador e CS
  IF v_candidato.vaga_relacionada_id IS NOT NULL THEN
    SELECT v.id, v.titulo, v.recrutador_id, v.cs_id
    INTO v_vaga
    FROM vagas v
    WHERE v.id = v_candidato.vaga_relacionada_id;
    
    IF v_vaga.id IS NOT NULL THEN
      -- Coletar IDs dos usuários a notificar
      v_user_ids := ARRAY[]::UUID[];
      
      IF v_vaga.recrutador_id IS NOT NULL THEN
        v_user_ids := array_append(v_user_ids, v_vaga.recrutador_id);
      END IF;
      
      IF v_vaga.cs_id IS NOT NULL AND v_vaga.cs_id != v_vaga.recrutador_id THEN
        v_user_ids := array_append(v_user_ids, v_vaga.cs_id);
      END IF;
      
      -- Criar notificações
      IF array_length(v_user_ids, 1) > 0 THEN
        PERFORM create_notifications_for_users(
          v_user_ids,
          'feedback',
          'Novo feedback recebido',
          format('Novo feedback para %s na vaga %s', v_candidato.nome_completo, v_vaga.titulo),
          v_vaga.id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificar sobre novos feedbacks
CREATE TRIGGER trigger_notify_new_feedback
  AFTER INSERT ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_feedback();
-- Create trigger function to notify client when feedback request is created
CREATE OR REPLACE FUNCTION public.notify_client_feedback_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_candidato RECORD;
  v_vaga RECORD;
BEGIN
  -- Buscar informações do candidato
  SELECT c.id, c.nome_completo, c.vaga_relacionada_id
  INTO v_candidato
  FROM candidatos c
  WHERE c.id = NEW.candidato_id;
  
  -- Se o candidato tem vaga relacionada, buscar cliente
  IF v_candidato.vaga_relacionada_id IS NOT NULL THEN
    SELECT v.id, v.titulo, v.cliente_id
    INTO v_vaga
    FROM vagas v
    WHERE v.id = v_candidato.vaga_relacionada_id;
    
    -- Se a vaga tem cliente vinculado, criar notificação
    IF v_vaga.cliente_id IS NOT NULL THEN
      PERFORM create_notification(
        v_vaga.cliente_id,
        'feedback_solicitado',
        'Feedback solicitado para candidato',
        format('Foi solicitado feedback para o candidato %s na vaga %s', v_candidato.nome_completo, v_vaga.titulo),
        v_vaga.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to notify client when feedback request is created
DROP TRIGGER IF EXISTS trigger_notify_client_feedback_request ON public.feedback_requests;
CREATE TRIGGER trigger_notify_client_feedback_request
  AFTER INSERT ON public.feedback_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_feedback_request();

-- Update the existing notify_job_stage_change function to also notify clients
CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status_slug IS DISTINCT FROM NEW.status_slug THEN
    
    -- Notificar recrutador se houver E se tiver perfil
    IF NEW.recrutador_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      SELECT 
        NEW.recrutador_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.recrutador_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Notificar CS se houver, for diferente do recrutador E se tiver perfil
    IF NEW.cs_id IS NOT NULL AND NEW.cs_id != NEW.recrutador_id THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      SELECT 
        NEW.cs_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.cs_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Notificar cliente se houver E se tiver perfil
    IF NEW.cliente_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      SELECT 
        NEW.cliente_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.cliente_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
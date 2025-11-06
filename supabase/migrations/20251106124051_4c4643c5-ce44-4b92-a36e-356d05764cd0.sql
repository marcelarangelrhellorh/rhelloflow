-- Fix notify_job_stage_change function to avoid set-returning functions in WHERE clause
CREATE OR REPLACE FUNCTION public.notify_job_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só notificar se o status mudou E se há recrutador/cs atribuído
  IF OLD.status_slug IS DISTINCT FROM NEW.status_slug THEN
    
    -- Notificar recrutador se houver
    IF NEW.recrutador_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      VALUES (
        NEW.recrutador_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Notificar CS se houver e for diferente do recrutador
    IF NEW.cs_id IS NOT NULL AND NEW.cs_id != NEW.recrutador_id THEN
      INSERT INTO public.notifications (user_id, kind, title, body, job_id)
      VALUES (
        NEW.cs_id,
        'etapa_vaga',
        format('Vaga "%s" mudou de etapa', NEW.titulo),
        format('Status alterado para: %s', NEW.status),
        NEW.id
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
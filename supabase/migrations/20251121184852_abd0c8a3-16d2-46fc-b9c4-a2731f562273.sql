-- Atualizar função create_notification para enviar email
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, 
  p_kind text, 
  p_title text, 
  p_body text DEFAULT NULL::text, 
  p_job_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
  v_supabase_url TEXT;
BEGIN
  -- Inserir notificação
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
  
  -- Disparar email em background (não bloqueia a criação da notificação)
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    
    IF v_supabase_url IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', p_user_id,
          'kind', p_kind,
          'title', p_title,
          'body', p_body,
          'job_id', p_job_id
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log erro mas não falha a notificação
    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
  END;
  
  RETURN v_notification_id;
END;
$function$;

-- Atualizar função create_notifications_for_users para enviar emails
CREATE OR REPLACE FUNCTION public.create_notifications_for_users(
  p_user_ids uuid[], 
  p_kind text, 
  p_title text, 
  p_body text DEFAULT NULL::text, 
  p_job_id uuid DEFAULT NULL::uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;
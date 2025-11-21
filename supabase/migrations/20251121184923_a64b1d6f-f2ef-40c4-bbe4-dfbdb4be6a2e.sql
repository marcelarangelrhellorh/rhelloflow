-- Reverter para a versão original das funções (sem chamada HTTP)
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
$function$;

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
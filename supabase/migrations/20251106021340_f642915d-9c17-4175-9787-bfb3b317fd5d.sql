-- Atualizar trigger para só notificar usuários com profile
CREATE OR REPLACE FUNCTION public.notifica_vaga_externa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_ids UUID[];
  v_valid_user_ids UUID[];
BEGIN
  IF NEW.source = 'externo' THEN
    -- Buscar todos os admins e recrutadores para notificar
    SELECT ARRAY_AGG(DISTINCT ur.user_id)
    INTO v_user_ids
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'recrutador');
    
    -- Filtrar apenas usuários que têm profile
    IF array_length(v_user_ids, 1) > 0 THEN
      SELECT ARRAY_AGG(p.id)
      INTO v_valid_user_ids
      FROM profiles p
      WHERE p.id = ANY(v_user_ids);
      
      -- Criar notificações apenas para usuários válidos
      IF array_length(v_valid_user_ids, 1) > 0 THEN
        PERFORM create_notifications_for_users(
          v_valid_user_ids,
          'vaga',
          'Vaga criada via formulário externo',
          format('A vaga "%s" foi criada externamente e precisa de campos de recrutamento preenchidos', NEW.titulo),
          NEW.id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
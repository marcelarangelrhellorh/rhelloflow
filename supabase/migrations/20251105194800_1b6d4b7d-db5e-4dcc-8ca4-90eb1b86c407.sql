-- Atualizar trigger de vaga externa para usar notifications ao invés de notificacoes
CREATE OR REPLACE FUNCTION public.notifica_vaga_externa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids UUID[];
  v_admin_ids UUID[];
BEGIN
  IF NEW.source = 'externo' THEN
    -- Buscar todos os admins e recrutadores para notificar
    SELECT ARRAY_AGG(DISTINCT ur.user_id)
    INTO v_admin_ids
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'recrutador');
    
    -- Criar notificações para admins e recrutadores
    IF array_length(v_admin_ids, 1) > 0 THEN
      PERFORM create_notifications_for_users(
        v_admin_ids,
        'vaga',
        'Vaga criada via formulário externo',
        format('A vaga "%s" foi criada externamente e precisa de campos de recrutamento preenchidos', NEW.titulo),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_notifica_vaga_externa ON public.vagas;
CREATE TRIGGER trigger_notifica_vaga_externa
AFTER INSERT ON public.vagas
FOR EACH ROW
EXECUTE FUNCTION notifica_vaga_externa();

COMMENT ON FUNCTION public.notifica_vaga_externa IS 'Trigger function to notify admins when a job is created via external form';
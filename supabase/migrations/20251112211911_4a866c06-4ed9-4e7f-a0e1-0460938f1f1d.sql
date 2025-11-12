-- Corrigir search_path da função validate_client_role_exclusivity
CREATE OR REPLACE FUNCTION validate_client_role_exclusivity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se está tentando adicionar role 'client'
  IF NEW.role = 'client' THEN
    -- Verifica se o usuário já tem outros roles
    IF EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = NEW.user_id 
      AND role != 'client'
    ) THEN
      RAISE EXCEPTION 'Usuários com role "client" não podem ter outros roles atribuídos. Remova os outros roles primeiro.';
    END IF;
  END IF;

  -- Se está tentando adicionar qualquer outro role
  IF NEW.role != 'client' THEN
    -- Verifica se o usuário já tem role 'client'
    IF EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = NEW.user_id 
      AND role = 'client'
    ) THEN
      RAISE EXCEPTION 'Este usuário possui role "client" e não pode ter outros roles. Remova o role "client" primeiro.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
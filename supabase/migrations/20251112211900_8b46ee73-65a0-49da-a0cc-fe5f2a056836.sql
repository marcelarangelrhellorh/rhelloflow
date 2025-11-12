-- Função para validar exclusividade do role 'client'
CREATE OR REPLACE FUNCTION validate_client_role_exclusivity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Cria o trigger para validar antes de inserir
DROP TRIGGER IF EXISTS check_client_role_exclusivity ON user_roles;
CREATE TRIGGER check_client_role_exclusivity
  BEFORE INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_role_exclusivity();

-- Comentário para documentação
COMMENT ON FUNCTION validate_client_role_exclusivity() IS 
'Garante que usuários com role "client" tenham exclusivamente este role, e vice-versa.';
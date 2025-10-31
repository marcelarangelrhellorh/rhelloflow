-- Função para atualizar disponibilidade quando candidato for contratado
CREATE OR REPLACE FUNCTION public.atualizar_disponibilidade_contratado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o status mudou para 'Contratado', marcar como não disponível
  IF NEW.status = 'Contratado' AND (OLD.status IS NULL OR OLD.status != 'Contratado') THEN
    NEW.disponibilidade_status := 'não_disponível';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função antes de atualizar um candidato
DROP TRIGGER IF EXISTS trigger_atualizar_disponibilidade_contratado ON public.candidatos;

CREATE TRIGGER trigger_atualizar_disponibilidade_contratado
  BEFORE UPDATE ON public.candidatos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_disponibilidade_contratado();
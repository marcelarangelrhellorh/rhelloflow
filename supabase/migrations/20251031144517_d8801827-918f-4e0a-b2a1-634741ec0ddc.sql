-- Adicionar campo de disponibilidade_status à tabela candidatos
ALTER TABLE public.candidatos
ADD COLUMN IF NOT EXISTS disponibilidade_status TEXT DEFAULT 'disponível';

-- Adicionar constraint para validar valores permitidos
ALTER TABLE public.candidatos
ADD CONSTRAINT disponibilidade_status_check 
CHECK (disponibilidade_status IN ('disponível', 'não_disponível'));

-- Comentário para documentação
COMMENT ON COLUMN public.candidatos.disponibilidade_status IS 
'Status de disponibilidade do candidato: disponível ou não_disponível';
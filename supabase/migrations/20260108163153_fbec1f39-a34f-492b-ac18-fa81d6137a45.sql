-- Adicionar coluna CPF na tabela candidatos
ALTER TABLE public.candidatos 
ADD COLUMN cpf VARCHAR(14) NULL;

-- Criar índice único para garantir não duplicidade (apenas para CPFs preenchidos e candidatos ativos)
CREATE UNIQUE INDEX idx_candidatos_cpf_unique 
ON public.candidatos(cpf) 
WHERE cpf IS NOT NULL AND deleted_at IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.candidatos.cpf IS 'CPF do candidato - usado como identificador único para evitar duplicidades';
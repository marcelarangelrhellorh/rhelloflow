-- Adicionar coluna data_abertura na tabela vagas
ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS data_abertura DATE DEFAULT CURRENT_DATE;

-- Atualizar vagas existentes para usar a data de criação
UPDATE public.vagas 
SET data_abertura = DATE(criado_em) 
WHERE data_abertura IS NULL;
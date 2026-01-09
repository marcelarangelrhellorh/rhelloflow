-- Adicionar novos campos para o formulário externo de vagas
ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS resumo_empresa TEXT,
ADD COLUMN IF NOT EXISTS motivo_contratacao TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.vagas.resumo_empresa IS 'Resumo/descrição da empresa para contexto da vaga';
COMMENT ON COLUMN public.vagas.motivo_contratacao IS 'Motivo da contratação: aumento_quadro, substituicao, reposicao';
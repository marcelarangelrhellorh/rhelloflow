-- Adicionar campo de habilidades comportamentais
ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS habilidades_comportamentais TEXT NULL;

COMMENT ON COLUMN public.vagas.habilidades_comportamentais IS 
  'Habilidades comportamentais/soft skills desejadas para a vaga';

-- Adicionar campo de quantidade de vagas
ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS quantidade_vagas INTEGER NULL DEFAULT 1;

COMMENT ON COLUMN public.vagas.quantidade_vagas IS 
  'Quantidade de posições abertas para este cargo';
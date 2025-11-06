-- Adicionar coluna tipo_contratacao na tabela vagas
ALTER TABLE public.vagas 
ADD COLUMN tipo_contratacao TEXT;

COMMENT ON COLUMN public.vagas.tipo_contratacao IS 'Formato da contratação: CLT, PJ ou CLT ou PJ';
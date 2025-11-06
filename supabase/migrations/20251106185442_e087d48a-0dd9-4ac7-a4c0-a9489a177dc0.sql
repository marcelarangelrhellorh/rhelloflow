-- Adicionar campos do solicitante na tabela vagas
ALTER TABLE public.vagas
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS contato_telefone TEXT,
ADD COLUMN IF NOT EXISTS contato_email TEXT;

COMMENT ON COLUMN public.vagas.contato_nome IS 'Nome do solicitante da vaga';
COMMENT ON COLUMN public.vagas.contato_telefone IS 'Telefone do solicitante da vaga';
COMMENT ON COLUMN public.vagas.contato_email IS 'E-mail do solicitante da vaga';
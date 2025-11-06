-- Adicionar campos de contato do solicitante na tabela vagas
ALTER TABLE public.vagas 
ADD COLUMN solicitante_nome TEXT,
ADD COLUMN solicitante_email TEXT,
ADD COLUMN solicitante_telefone TEXT;

COMMENT ON COLUMN public.vagas.solicitante_nome IS 'Nome do solicitante da vaga';
COMMENT ON COLUMN public.vagas.solicitante_email IS 'E-mail de contato do solicitante';
COMMENT ON COLUMN public.vagas.solicitante_telefone IS 'Telefone de contato do solicitante';
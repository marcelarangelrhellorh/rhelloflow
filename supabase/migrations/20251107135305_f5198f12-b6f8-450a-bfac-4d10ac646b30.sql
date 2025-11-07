-- Adicionar colunas idade e idiomas à tabela candidatos
ALTER TABLE public.candidatos
ADD COLUMN IF NOT EXISTS idade INTEGER,
ADD COLUMN IF NOT EXISTS idiomas TEXT;
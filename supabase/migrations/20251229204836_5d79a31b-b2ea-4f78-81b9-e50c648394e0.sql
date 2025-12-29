-- Adicionar coluna cargo na tabela candidatos
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS cargo TEXT;
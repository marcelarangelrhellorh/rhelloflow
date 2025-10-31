-- Alterar tipo do campo disponibilidade_mudanca de boolean para text
ALTER TABLE public.candidatos
ALTER COLUMN disponibilidade_mudanca TYPE TEXT;

-- Atualizar valores existentes de boolean para text
UPDATE public.candidatos
SET disponibilidade_mudanca = CASE 
  WHEN disponibilidade_mudanca::text = 'true' THEN 'Sim'
  WHEN disponibilidade_mudanca::text = 'false' THEN 'Não'
  ELSE NULL
END
WHERE disponibilidade_mudanca IS NOT NULL;

-- Atualizar buckets para serem públicos
UPDATE storage.buckets
SET public = true
WHERE id IN ('curriculos', 'portfolios');
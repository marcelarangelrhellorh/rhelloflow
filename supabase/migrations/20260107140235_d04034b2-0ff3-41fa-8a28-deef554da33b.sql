-- Atualizar defaults da tabela vagas para usar status válido
ALTER TABLE public.vagas ALTER COLUMN status_slug SET DEFAULT 'discovery';
ALTER TABLE public.vagas ALTER COLUMN status_order SET DEFAULT 1;
ALTER TABLE public.vagas ALTER COLUMN status SET DEFAULT 'Discovery';

-- Corrigir registros existentes com status_slug inválido
UPDATE public.vagas 
SET status_slug = 'discovery', 
    status_order = 1, 
    status = 'Discovery'
WHERE status_slug = 'a_iniciar' OR status_slug IS NULL;
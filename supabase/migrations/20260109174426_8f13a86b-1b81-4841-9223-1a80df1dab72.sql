-- Remover foreign key da tabela candidatos
ALTER TABLE public.candidatos 
DROP COLUMN IF EXISTS candidate_form_link_id;

-- Remover tabela de eventos (depende de candidate_form_links)
DROP TABLE IF EXISTS public.candidate_form_link_events;

-- Remover tabela principal
DROP TABLE IF EXISTS public.candidate_form_links;
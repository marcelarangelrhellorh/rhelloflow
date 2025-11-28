-- Adicionar campo para emails de participantes nas tarefas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS attendee_emails text[] DEFAULT '{}';

-- Adicionar campo para armazenar o link do Meet gerado
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS google_meet_link text;

-- Comentários
COMMENT ON COLUMN public.tasks.attendee_emails IS 'Lista de emails dos participantes que receberão convite';
COMMENT ON COLUMN public.tasks.google_meet_link IS 'Link do Google Meet gerado automaticamente';
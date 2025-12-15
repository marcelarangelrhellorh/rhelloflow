-- Add meeting_outcome column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS meeting_outcome TEXT DEFAULT NULL;

-- Add check constraint for valid values
ALTER TABLE public.tasks 
ADD CONSTRAINT meeting_outcome_check 
CHECK (meeting_outcome IS NULL OR meeting_outcome IN ('completed', 'cancelled', 'no_show'));

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.meeting_outcome IS 'Desfecho da reunião: completed (Concluída), cancelled (Cancelada), no_show (Não compareceu). Aplicável apenas quando task_type=meeting';
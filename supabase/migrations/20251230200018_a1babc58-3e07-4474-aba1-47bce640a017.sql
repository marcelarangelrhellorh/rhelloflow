-- Add type to scorecard_templates (entrevista or teste_tecnico)
ALTER TABLE public.scorecard_templates 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'entrevista' 
CHECK (type IN ('entrevista', 'teste_tecnico'));

-- Add question_type and options to scorecard_criteria
ALTER TABLE public.scorecard_criteria 
ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'rating' CHECK (question_type IN ('rating', 'open_text', 'multiple_choice')),
ADD COLUMN IF NOT EXISTS options jsonb DEFAULT NULL;

-- Add fields for external technical tests to candidate_scorecards
ALTER TABLE public.candidate_scorecards 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'interno' CHECK (source IN ('interno', 'externo')),
ADD COLUMN IF NOT EXISTS external_token text UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Add fields for candidate responses to scorecard_evaluations
ALTER TABLE public.scorecard_evaluations 
ADD COLUMN IF NOT EXISTS text_answer text,
ADD COLUMN IF NOT EXISTS selected_option_index integer,
ADD COLUMN IF NOT EXISTS is_correct boolean,
ADD COLUMN IF NOT EXISTS graded_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS graded_at timestamptz;

-- Create index for external_token lookups
CREATE INDEX IF NOT EXISTS idx_candidate_scorecards_external_token 
ON public.candidate_scorecards(external_token) 
WHERE external_token IS NOT NULL;

-- Create index for expires_at to efficiently find expired tests
CREATE INDEX IF NOT EXISTS idx_candidate_scorecards_expires_at 
ON public.candidate_scorecards(expires_at) 
WHERE expires_at IS NOT NULL;

-- Create function to notify when technical test is completed
CREATE OR REPLACE FUNCTION public.notify_technical_test_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only notify if submitted_at was just set (test completed)
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL AND NEW.source = 'externo' THEN
    -- Get candidate and job info for the notification
    INSERT INTO public.notifications (user_id, kind, title, body, job_id)
    SELECT 
      NEW.created_by,
      'teste_tecnico',
      'Teste técnico respondido',
      format('O candidato %s completou o teste técnico', c.nome_completo),
      NEW.vaga_id
    FROM public.candidatos c
    WHERE c.id = NEW.candidate_id
    AND NEW.created_by IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for technical test completion notification
DROP TRIGGER IF EXISTS trigger_notify_technical_test_completed ON public.candidate_scorecards;
CREATE TRIGGER trigger_notify_technical_test_completed
  AFTER UPDATE ON public.candidate_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_technical_test_completed();

-- Function to get technical test by token (public access)
CREATE OR REPLACE FUNCTION public.get_technical_test_by_token(p_token text)
RETURNS TABLE(
  scorecard_id uuid,
  template_id uuid,
  candidate_id uuid,
  candidate_name text,
  vaga_id uuid,
  vaga_titulo text,
  expires_at timestamptz,
  submitted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    cs.id as scorecard_id,
    cs.template_id,
    cs.candidate_id,
    c.nome_completo as candidate_name,
    cs.vaga_id,
    v.titulo as vaga_titulo,
    cs.expires_at,
    cs.submitted_at
  FROM public.candidate_scorecards cs
  JOIN public.candidatos c ON c.id = cs.candidate_id
  LEFT JOIN public.vagas v ON v.id = cs.vaga_id
  WHERE cs.external_token = p_token
    AND cs.source = 'externo'
    AND (cs.expires_at IS NULL OR cs.expires_at > now())
  LIMIT 1;
$$;
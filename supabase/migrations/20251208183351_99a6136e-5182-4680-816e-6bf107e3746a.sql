-- =============================================
-- JESTOR INTEGRATION: New columns + Triggers
-- =============================================

-- ETAPA 2: Add new columns for Jestor integration

-- candidatos: visibility flag, hire date, idempotency
ALTER TABLE public.candidatos
  ADD COLUMN IF NOT EXISTS is_visible_for_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hired_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- vagas: who changed status last, idempotency
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS last_status_change_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- feedbacks: idempotency
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- tasks: idempotency
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- job_stage_history: correlation_id for idempotency
ALTER TABLE public.job_stage_history
  ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_job_stage_history_correlation_id 
  ON public.job_stage_history(correlation_id) 
  WHERE correlation_id IS NOT NULL;

-- =============================================
-- ETAPA 3: Triggers
-- =============================================

-- Trigger function: set is_visible_for_client when status = 'Shortlist'
CREATE OR REPLACE FUNCTION public.fn_set_is_visible_for_client()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.is_visible_for_client := (NEW.status = 'Shortlist');
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
      NEW.is_visible_for_client := (NEW.status = 'Shortlist');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_is_visible_for_client ON public.candidatos;
CREATE TRIGGER trg_set_is_visible_for_client
  BEFORE INSERT OR UPDATE ON public.candidatos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_is_visible_for_client();

-- Trigger function: insert job_stage_history with correlation_id for idempotency
CREATE OR REPLACE FUNCTION public.fn_job_stage_history_insert_with_correlation()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  corr_id text;
BEGIN
  -- Generate correlation_id if not provided via idempotency_key
  corr_id := COALESCE(NEW.idempotency_key, gen_random_uuid()::text);
  
  -- Insert into job_stage_history with ON CONFLICT for idempotency
  INSERT INTO public.job_stage_history(job_id, from_status, to_status, changed_at, changed_by, correlation_id)
  VALUES (NEW.id, OLD.status, NEW.status, now(), NEW.last_status_change_by, corr_id)
  ON CONFLICT (correlation_id) WHERE correlation_id IS NOT NULL DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_stage_history_with_correlation ON public.vagas;
CREATE TRIGGER trg_job_stage_history_with_correlation
  AFTER UPDATE ON public.vagas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_job_stage_history_insert_with_correlation();

-- Update existing candidatos to set is_visible_for_client based on current status
UPDATE public.candidatos 
SET is_visible_for_client = (status = 'Shortlist')
WHERE is_visible_for_client IS NULL OR is_visible_for_client = false;
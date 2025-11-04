-- ================================================
-- SOFT-DELETE COLUMNS AND DELETION AUDIT SYSTEM
-- ================================================

-- Add soft-delete columns to candidatos
ALTER TABLE public.candidatos
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('SOFT', 'HARD'));

-- Add soft-delete columns to vagas
ALTER TABLE public.vagas
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('SOFT', 'HARD'));

-- Add soft-delete columns to feedbacks
ALTER TABLE public.feedbacks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('SOFT', 'HARD'));

-- Create deletion_approvals table for high-risk deletion workflows
CREATE TABLE IF NOT EXISTS public.deletion_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  deletion_reason TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium', 'high', 'critical')),
  requires_mfa BOOLEAN NOT NULL DEFAULT false,
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  metadata JSONB
);

ALTER TABLE public.deletion_approvals ENABLE ROW LEVEL SECURITY;

-- Only admins can manage deletion approvals
CREATE POLICY "Admins can manage deletion approvals"
ON public.deletion_approvals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Requesters can view their own requests
CREATE POLICY "Users can view own deletion requests"
ON public.deletion_approvals
FOR SELECT
USING (requested_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create pre_delete_snapshots table for audit trail
CREATE TABLE IF NOT EXISTS public.pre_delete_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('SOFT', 'HARD')),
  correlation_id UUID NOT NULL,
  encrypted BOOLEAN NOT NULL DEFAULT false,
  encryption_key_id TEXT
);

ALTER TABLE public.pre_delete_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can view snapshots
CREATE POLICY "Admins can view delete snapshots"
ON public.pre_delete_snapshots
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert snapshots (audit trail)
CREATE POLICY "Authenticated users can insert snapshots"
ON public.pre_delete_snapshots
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update feedbacks RLS policy: authors can soft-delete, only admins can hard-delete
DROP POLICY IF EXISTS "feedbacks_delete_author_or_admin" ON public.feedbacks;

-- Authors can update their own feedback to mark as deleted (soft-delete)
CREATE POLICY "Authors can soft-delete own feedback"
ON public.feedbacks
FOR UPDATE
USING (
  auth.uid() = author_user_id 
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = author_user_id 
  AND (deleted_at IS NOT NULL AND deletion_type = 'SOFT')
);

-- Only admins can hard-delete (actual DELETE operation)
CREATE POLICY "Admins can hard-delete feedback"
ON public.feedbacks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update candidatos queries to exclude soft-deleted by default
-- Create view for active (non-deleted) candidates
CREATE OR REPLACE VIEW public.candidatos_active AS
SELECT * FROM public.candidatos
WHERE deleted_at IS NULL;

-- Update vagas queries to exclude soft-deleted by default
-- Create view for active (non-deleted) jobs
CREATE OR REPLACE VIEW public.vagas_active AS
SELECT * FROM public.vagas
WHERE deleted_at IS NULL;

-- Update feedbacks queries to exclude soft-deleted by default
-- Create view for active (non-deleted) feedbacks
CREATE OR REPLACE VIEW public.feedbacks_active AS
SELECT * FROM public.feedbacks
WHERE deleted_at IS NULL;

-- Function to assess deletion risk level
CREATE OR REPLACE FUNCTION public.assess_deletion_risk(
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_level TEXT := 'medium';
  v_active_count INT;
BEGIN
  IF p_resource_type = 'candidate' THEN
    -- Check if candidate has active job applications
    SELECT COUNT(*) INTO v_active_count
    FROM candidatos c
    WHERE c.id = p_resource_id
      AND c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante')
      AND c.vaga_relacionada_id IS NOT NULL;
    
    IF v_active_count > 0 THEN
      v_risk_level := 'high';
    END IF;
    
  ELSIF p_resource_type = 'job' THEN
    -- Check if job has active candidates
    SELECT COUNT(*) INTO v_active_count
    FROM candidatos c
    WHERE c.vaga_relacionada_id = p_resource_id
      AND c.status NOT IN ('Contratado', 'Reprovado rhello', 'Reprovado Solicitante');
    
    IF v_active_count > 10 THEN
      v_risk_level := 'critical';
    ELSIF v_active_count > 0 THEN
      v_risk_level := 'high';
    END IF;
  END IF;
  
  RETURN v_risk_level;
END;
$$;

-- Function to create pre-delete snapshot
CREATE OR REPLACE FUNCTION public.create_pre_delete_snapshot(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_snapshot_data JSONB,
  p_deletion_type TEXT,
  p_correlation_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  INSERT INTO public.pre_delete_snapshots (
    resource_type,
    resource_id,
    snapshot_data,
    deleted_by,
    deletion_type,
    correlation_id
  ) VALUES (
    p_resource_type,
    p_resource_id,
    p_snapshot_data,
    auth.uid(),
    p_deletion_type,
    p_correlation_id
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidatos_deleted_at ON public.candidatos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vagas_deleted_at ON public.vagas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedbacks_deleted_at ON public.feedbacks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deletion_approvals_status ON public.deletion_approvals(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_pre_delete_snapshots_resource ON public.pre_delete_snapshots(resource_type, resource_id);

-- Comments for documentation
COMMENT ON COLUMN public.candidatos.deleted_at IS 'Soft-delete timestamp. NULL means active record.';
COMMENT ON COLUMN public.candidatos.deletion_type IS 'SOFT = recoverable soft-delete, HARD = irreversible deletion';
COMMENT ON TABLE public.deletion_approvals IS 'Tracks approval workflow for high-risk deletion operations';
COMMENT ON TABLE public.pre_delete_snapshots IS 'Append-only audit trail of pre-deletion state for all deleted resources';

-- Migration: Fix Critical Database Issues
-- Date: 2025-01-06
-- Priority: P0 and P1

-- ============================================
-- P0.1: Remove redundant role column from users table
-- This column duplicates user_roles and has caused inconsistencies
-- ============================================

ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- Update get_user_role function to use user_roles table only
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = $1 
  LIMIT 1;
$$;

-- ============================================
-- P1.1: Add missing indexes for better performance
-- ============================================

-- Indexes for vagas foreign keys (recrutador_id, cs_id)
CREATE INDEX IF NOT EXISTS idx_vagas_recrutador_id 
  ON public.vagas(recrutador_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vagas_cs_id 
  ON public.vagas(cs_id) 
  WHERE deleted_at IS NULL;

-- Index for feedbacks with request_id
CREATE INDEX IF NOT EXISTS idx_feedbacks_request_id 
  ON public.feedbacks(request_id) 
  WHERE request_id IS NOT NULL;

-- Index for scorecards by vaga
CREATE INDEX IF NOT EXISTS idx_candidate_scorecards_vaga 
  ON public.candidate_scorecards(vaga_id) 
  WHERE vaga_id IS NOT NULL;

-- Composite index for share_link_events (common in analytics)
CREATE INDEX IF NOT EXISTS idx_share_link_events_link_created 
  ON public.share_link_events(share_link_id, created_at DESC);

-- Index for unread notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, created_at DESC) 
  WHERE read_at IS NULL;

-- Index for tags by category (for faster filtering)
CREATE INDEX IF NOT EXISTS idx_tags_category_active 
  ON public.tags(category, label) 
  WHERE active = true;

-- Index for deletion approvals by status
CREATE INDEX IF NOT EXISTS idx_deletion_approvals_requester 
  ON public.deletion_approvals(requested_by, status);

-- ============================================
-- P1.2: Add CHECK constraints for data integrity
-- ============================================

-- Ensure email format is valid (basic check)
ALTER TABLE public.candidatos 
  DROP CONSTRAINT IF EXISTS candidatos_email_format_check;

ALTER TABLE public.candidatos 
  ADD CONSTRAINT candidatos_email_format_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure phone is not empty string
ALTER TABLE public.candidatos 
  DROP CONSTRAINT IF EXISTS candidatos_telefone_not_empty_check;

ALTER TABLE public.candidatos 
  ADD CONSTRAINT candidatos_telefone_not_empty_check 
  CHECK (telefone IS NULL OR length(trim(telefone)) > 0);

-- Ensure pretensao_salarial is positive
ALTER TABLE public.candidatos 
  DROP CONSTRAINT IF EXISTS candidatos_pretensao_salarial_positive_check;

ALTER TABLE public.candidatos 
  ADD CONSTRAINT candidatos_pretensao_salarial_positive_check 
  CHECK (pretensao_salarial IS NULL OR pretensao_salarial > 0);

-- Ensure avaliacao is between 1 and 5
ALTER TABLE public.feedbacks 
  DROP CONSTRAINT IF EXISTS feedbacks_avaliacao_range_check;

ALTER TABLE public.feedbacks 
  ADD CONSTRAINT feedbacks_avaliacao_range_check 
  CHECK (avaliacao IS NULL OR (avaliacao >= 1 AND avaliacao <= 5));

-- ============================================
-- P1.3: Add helpful comments to critical tables
-- ============================================

COMMENT ON TABLE public.user_roles IS 
  'Stores user roles. This is the single source of truth for user permissions. Each user can have multiple roles.';

COMMENT ON COLUMN public.user_roles.role IS 
  'User role: admin, recrutador, cs, or viewer. Users can have multiple roles simultaneously.';

COMMENT ON TABLE public.candidatos IS 
  'Stores candidate information. Includes soft delete (deleted_at) for LGPD compliance.';

COMMENT ON COLUMN public.candidatos.deleted_at IS 
  'Soft delete timestamp. When not null, the candidate is considered deleted but data is retained for audit.';

COMMENT ON TABLE public.share_links IS 
  'Public sharing links for job postings. Each link has a unique token and optional password protection.';

COMMENT ON COLUMN public.share_links.token IS 
  'Unique random token (128-bit security) used in the public URL. Must be kept secure.';

COMMENT ON TABLE public.audit_events IS 
  'Immutable audit log for all critical actions. Uses cryptographic hashing for tamper detection.';

-- ============================================
-- P1.4: Create helper function for safely getting all user roles
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT array_agg(role) 
  FROM public.user_roles 
  WHERE user_id = $1;
$$;

COMMENT ON FUNCTION public.get_user_roles IS 
  'Returns array of all roles for a given user. Used for authorization checks.';

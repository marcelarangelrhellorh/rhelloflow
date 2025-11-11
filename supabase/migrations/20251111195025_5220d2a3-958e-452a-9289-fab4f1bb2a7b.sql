-- Fix RLS policies to allow CS role access to candidates and related data

-- Drop existing restrictive policies for candidatos
DROP POLICY IF EXISTS "candidatos_select_restricted" ON public.candidatos;
DROP POLICY IF EXISTS "candidatos_insert_restricted" ON public.candidatos;
DROP POLICY IF EXISTS "candidatos_update_restricted" ON public.candidatos;

-- Recreate policies including CS role
CREATE POLICY "candidatos_select_restricted" 
ON public.candidatos 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "candidatos_insert_restricted" 
ON public.candidatos 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "candidatos_update_restricted" 
ON public.candidatos 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

-- Fix feedbacks policies to include CS
DROP POLICY IF EXISTS "feedbacks_select_restricted" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_restricted" ON public.feedbacks;

CREATE POLICY "feedbacks_select_restricted" 
ON public.feedbacks 
FOR SELECT 
USING (
  auth.uid() = author_user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "feedbacks_insert_restricted" 
ON public.feedbacks 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_user_id AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR
    has_role(auth.uid(), 'cs'::app_role)
  )
);

-- Fix historico_candidatos policies to include CS
DROP POLICY IF EXISTS "historico_select_restricted" ON public.historico_candidatos;
DROP POLICY IF EXISTS "historico_insert_restricted" ON public.historico_candidatos;

CREATE POLICY "historico_select_restricted" 
ON public.historico_candidatos 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "historico_insert_restricted" 
ON public.historico_candidatos 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

-- Add comment for documentation
COMMENT ON POLICY "candidatos_select_restricted" ON public.candidatos IS 
'Permite admin, recrutadores e CS visualizarem candidatos';
COMMENT ON POLICY "feedbacks_select_restricted" ON public.feedbacks IS 
'Permite admin, recrutadores e CS visualizarem feedbacks';
COMMENT ON POLICY "historico_select_restricted" ON public.historico_candidatos IS 
'Permite admin, recrutadores e CS visualizarem histórico de candidatos';
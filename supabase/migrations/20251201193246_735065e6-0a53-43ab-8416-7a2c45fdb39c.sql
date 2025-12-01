-- Create candidate_notes table for storing notes about candidates
CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate_id ON public.candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_created_at ON public.candidate_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view candidate notes
CREATE POLICY "Authenticated users can view candidate notes"
  ON public.candidate_notes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert candidate notes
CREATE POLICY "Authenticated users can insert candidate notes"
  ON public.candidate_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins and recruiters can manage all notes
CREATE POLICY "Admins and recruiters can manage all notes"
  ON public.candidate_notes
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role)
  );
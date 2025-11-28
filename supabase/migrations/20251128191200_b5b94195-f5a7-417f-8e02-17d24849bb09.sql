-- Create job_history table for CRM-like notes on jobs
CREATE TABLE public.job_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_job_history_job_id ON public.job_history(job_id);
CREATE INDEX idx_job_history_created_at ON public.job_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view job history"
ON public.job_history FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters and admins can insert job history"
ON public.job_history FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "Recruiters and admins can update job history"
ON public.job_history FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

CREATE POLICY "Admins can delete job history"
ON public.job_history FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
-- Criar tabela para logs de análise de scorecards
CREATE TABLE public.scorecard_analysis_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  analyzed_by UUID NOT NULL,
  candidates_count INTEGER NOT NULL,
  anonymized BOOLEAN NOT NULL DEFAULT false,
  included_comments BOOLEAN NOT NULL DEFAULT true,
  ai_model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca por vaga
CREATE INDEX idx_scorecard_analysis_logs_vaga_id ON public.scorecard_analysis_logs(vaga_id);
CREATE INDEX idx_scorecard_analysis_logs_analyzed_by ON public.scorecard_analysis_logs(analyzed_by);

-- Enable RLS
ALTER TABLE public.scorecard_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Política: Recrutadores e admins podem visualizar logs
CREATE POLICY "Authenticated users can view analysis logs"
ON public.scorecard_analysis_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role) OR
  has_role(auth.uid(), 'cs'::app_role)
);

-- Política: Sistema pode inserir logs
CREATE POLICY "System can insert analysis logs"
ON public.scorecard_analysis_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
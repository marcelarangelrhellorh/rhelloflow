-- Criar tabela para gerenciar requisições de feedback externo
CREATE TABLE IF NOT EXISTS public.feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  recrutador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  allow_multiple boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Adicionar índices para performance
CREATE INDEX idx_feedback_requests_token ON public.feedback_requests(token);
CREATE INDEX idx_feedback_requests_vaga ON public.feedback_requests(vaga_id);
CREATE INDEX idx_feedback_requests_candidato ON public.feedback_requests(candidato_id);

-- Adicionar colunas à tabela feedbacks existente para suportar feedback externo
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.feedback_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS origem text DEFAULT 'recrutador' CHECK (origem IN ('recrutador', 'cliente', 'interno')),
ADD COLUMN IF NOT EXISTS sender_name text,
ADD COLUMN IF NOT EXISTS sender_email text,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS quick_tags text[];

-- Atualizar feedbacks existentes para ter origem 'recrutador'
UPDATE public.feedbacks SET origem = 'recrutador' WHERE origem IS NULL;

-- RLS para feedback_requests
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recrutadores e admins podem criar requests"
ON public.feedback_requests FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "Recrutadores e admins podem ver seus requests"
ON public.feedback_requests FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "Público pode validar token"
ON public.feedback_requests FOR SELECT
TO anon
USING (expires_at > now());

-- Atualizar política de feedbacks para permitir inserção pública via token
CREATE POLICY "Público pode inserir feedback via token válido"
ON public.feedbacks FOR INSERT
TO anon
WITH CHECK (
  request_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.feedback_requests
    WHERE id = request_id
    AND expires_at > now()
  )
);
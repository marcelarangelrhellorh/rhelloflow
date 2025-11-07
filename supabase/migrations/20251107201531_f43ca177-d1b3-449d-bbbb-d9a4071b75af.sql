-- Create whatsapp_sends table for tracking WhatsApp messages
CREATE TABLE IF NOT EXISTS public.whatsapp_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  vacancy_id UUID REFERENCES public.vagas(id) ON DELETE SET NULL,
  sent_by UUID NOT NULL,
  number TEXT NOT NULL,
  text TEXT NOT NULL,
  template_key TEXT,
  provider_response JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.whatsapp_sends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view whatsapp sends"
  ON public.whatsapp_sends
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters can create whatsapp sends"
  ON public.whatsapp_sends
  FOR INSERT
  WITH CHECK (
    auth.uid() = sent_by 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  );

-- Index for better query performance
CREATE INDEX idx_whatsapp_sends_candidate ON public.whatsapp_sends(candidate_id);
CREATE INDEX idx_whatsapp_sends_status ON public.whatsapp_sends(status);
CREATE INDEX idx_whatsapp_sends_created ON public.whatsapp_sends(created_at DESC);
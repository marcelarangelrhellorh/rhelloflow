-- Criar tabela de links de compartilhamento
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_submissions INTEGER,
  submissions_count INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Adicionar coluna source_link_id em candidatos
ALTER TABLE public.candidatos 
ADD COLUMN IF NOT EXISTS source_link_id UUID REFERENCES public.share_links(id),
ADD COLUMN IF NOT EXISTS utm JSONB;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_vaga_id ON public.share_links(vaga_id);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON public.share_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_candidatos_source_link ON public.candidatos(source_link_id) WHERE source_link_id IS NOT NULL;

-- Criar tabela de eventos de share links para analytics
CREATE TABLE IF NOT EXISTS public.share_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID REFERENCES public.share_links(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'click', 'submit'
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_link_events_link_id ON public.share_link_events(share_link_id);
CREATE INDEX IF NOT EXISTS idx_share_link_events_type ON public.share_link_events(event_type);
CREATE INDEX IF NOT EXISTS idx_share_link_events_created_at ON public.share_link_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies para share_links
CREATE POLICY "Authenticated users can view share links"
ON public.share_links FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recruiters and admins can create share links"
ON public.share_links FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "Recruiters and admins can update share links"
ON public.share_links FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "Admins can delete share links"
ON public.share_links FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para share_link_events (somente leitura para authenticated)
CREATE POLICY "Authenticated users can view share link events"
ON public.share_link_events FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert share link events"
ON public.share_link_events FOR INSERT
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_share_links_updated_at
BEFORE UPDATE ON public.share_links
FOR EACH ROW
EXECUTE FUNCTION update_share_links_updated_at();
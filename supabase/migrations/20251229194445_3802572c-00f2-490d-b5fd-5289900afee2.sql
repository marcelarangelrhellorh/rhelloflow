-- Add new columns to candidatos table
ALTER TABLE public.candidatos 
  ADD COLUMN IF NOT EXISTS modelo_contratacao TEXT,
  ADD COLUMN IF NOT EXISTS formato_trabalho TEXT,
  ADD COLUMN IF NOT EXISTS fit_cultural JSONB,
  ADD COLUMN IF NOT EXISTS talent_pool_link_id UUID;

-- Create talent_pool_links table
CREATE TABLE IF NOT EXISTS public.talent_pool_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_submissions INTEGER,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  note TEXT
);

-- Create talent_pool_link_events table for tracking
CREATE TABLE IF NOT EXISTS public.talent_pool_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.talent_pool_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_talent_pool_links_token ON public.talent_pool_links(token);
CREATE INDEX IF NOT EXISTS idx_talent_pool_links_active ON public.talent_pool_links(active);
CREATE INDEX IF NOT EXISTS idx_talent_pool_link_events_link_id ON public.talent_pool_link_events(link_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_talent_pool_link_id ON public.candidatos(talent_pool_link_id);

-- Add foreign key for candidatos.talent_pool_link_id
ALTER TABLE public.candidatos
  ADD CONSTRAINT candidatos_talent_pool_link_id_fkey 
  FOREIGN KEY (talent_pool_link_id) 
  REFERENCES public.talent_pool_links(id) 
  ON DELETE SET NULL;

-- Enable RLS on talent_pool_links
ALTER TABLE public.talent_pool_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for talent_pool_links
CREATE POLICY "Admins and recruiters can manage talent pool links"
ON public.talent_pool_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

CREATE POLICY "Public can view active talent pool links by token"
ON public.talent_pool_links
FOR SELECT
USING (active = true AND (expires_at IS NULL OR expires_at > now()) AND revoked = false);

-- Enable RLS on talent_pool_link_events
ALTER TABLE public.talent_pool_link_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for talent_pool_link_events
CREATE POLICY "Admins and recruiters can view events"
ON public.talent_pool_link_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

CREATE POLICY "System can insert events"
ON public.talent_pool_link_events
FOR INSERT
WITH CHECK (true);

-- Create function to update updated_at on talent_pool_links
CREATE OR REPLACE FUNCTION public.update_talent_pool_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_talent_pool_links_updated_at ON public.talent_pool_links;
CREATE TRIGGER update_talent_pool_links_updated_at
  BEFORE UPDATE ON public.talent_pool_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_talent_pool_links_updated_at();

-- Function to check if talent pool link is valid
CREATE OR REPLACE FUNCTION public.get_talent_pool_link_by_token(p_token text)
RETURNS TABLE(
  id uuid, 
  token text, 
  active boolean, 
  expires_at timestamptz, 
  created_at timestamptz, 
  max_submissions integer, 
  submissions_count integer,
  requires_password boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tpl.id, 
    tpl.token, 
    tpl.active, 
    tpl.expires_at, 
    tpl.created_at, 
    tpl.max_submissions, 
    tpl.submissions_count,
    (tpl.password_hash IS NOT NULL) as requires_password
  FROM public.talent_pool_links tpl
  WHERE tpl.token = p_token
    AND tpl.active = true
    AND COALESCE(tpl.revoked, false) = false
    AND (tpl.expires_at IS NULL OR tpl.expires_at > now())
  LIMIT 1;
$$;

-- Function to check if talent pool link has active link
CREATE OR REPLACE FUNCTION public.has_active_talent_pool_link()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM talent_pool_links
    WHERE active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND COALESCE(revoked, false) = false
  );
$$;
-- Create table for candidate registration links
CREATE TABLE public.candidate_registration_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_submissions INTEGER,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  note TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  password_hash TEXT
);

-- Create table for candidate registration link events
CREATE TABLE public.candidate_registration_link_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.candidate_registration_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_registration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_registration_link_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_registration_links
CREATE POLICY "Authenticated users can view candidate registration links"
ON public.candidate_registration_links
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create candidate registration links"
ON public.candidate_registration_links
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update candidate registration links"
ON public.candidate_registration_links
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS Policies for candidate_registration_link_events
CREATE POLICY "Authenticated users can view candidate registration link events"
ON public.candidate_registration_link_events
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert candidate registration link events"
ON public.candidate_registration_link_events
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_candidate_registration_links_updated_at
BEFORE UPDATE ON public.candidate_registration_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for token lookups
CREATE INDEX idx_candidate_registration_links_token ON public.candidate_registration_links(token);
CREATE INDEX idx_candidate_registration_link_events_link_id ON public.candidate_registration_link_events(link_id);

-- Create function to get candidate registration link by token
CREATE OR REPLACE FUNCTION public.get_candidate_registration_link_by_token(p_token text)
RETURNS TABLE(
  id uuid, 
  token text, 
  active boolean, 
  expires_at timestamp with time zone, 
  created_at timestamp with time zone, 
  max_submissions integer, 
  submissions_count integer, 
  requires_password boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    crl.id, 
    crl.token, 
    crl.active, 
    crl.expires_at, 
    crl.created_at, 
    crl.max_submissions, 
    crl.submissions_count,
    (crl.password_hash IS NOT NULL) as requires_password
  FROM public.candidate_registration_links crl
  WHERE crl.token = p_token
    AND crl.active = true
    AND COALESCE(crl.revoked, false) = false
    AND (crl.expires_at IS NULL OR crl.expires_at > now())
  LIMIT 1;
$$;

-- Add column to candidatos to track candidate registration link
ALTER TABLE public.candidatos 
ADD COLUMN IF NOT EXISTS candidate_registration_link_id UUID REFERENCES public.candidate_registration_links(id);
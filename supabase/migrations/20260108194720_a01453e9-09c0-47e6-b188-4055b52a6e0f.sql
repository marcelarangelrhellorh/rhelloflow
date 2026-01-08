-- Create table for candidate form links (linked to job)
CREATE TABLE public.candidate_form_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_submissions INTEGER,
  submissions_count INTEGER DEFAULT 0,
  password_hash TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  note TEXT
);

-- Create indexes for performance
CREATE INDEX idx_candidate_form_links_token ON public.candidate_form_links(token);
CREATE INDEX idx_candidate_form_links_vaga_id ON public.candidate_form_links(vaga_id);
CREATE INDEX idx_candidate_form_links_created_by ON public.candidate_form_links(created_by);

-- Enable RLS
ALTER TABLE public.candidate_form_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_form_links
CREATE POLICY "Authenticated users can view candidate form links"
ON public.candidate_form_links
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create candidate form links"
ON public.candidate_form_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update candidate form links"
ON public.candidate_form_links
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete candidate form links"
ON public.candidate_form_links
FOR DELETE
TO authenticated
USING (true);

-- Create table for tracking events
CREATE TABLE public.candidate_form_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.candidate_form_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for events
CREATE INDEX idx_candidate_form_link_events_link_id ON public.candidate_form_link_events(link_id);

-- Enable RLS for events
ALTER TABLE public.candidate_form_link_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for events (authenticated users can view/insert)
CREATE POLICY "Authenticated users can view candidate form link events"
ON public.candidate_form_link_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can insert candidate form link events"
ON public.candidate_form_link_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Add column to candidatos table to reference the new link type
ALTER TABLE public.candidatos ADD COLUMN candidate_form_link_id UUID REFERENCES public.candidate_form_links(id);
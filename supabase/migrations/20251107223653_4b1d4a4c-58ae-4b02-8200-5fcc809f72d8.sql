-- Create table for client view links
CREATE TABLE IF NOT EXISTS public.client_view_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_view_links_token ON public.client_view_links(token) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_client_view_links_vaga_id ON public.client_view_links(vaga_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_client_view_links_active ON public.client_view_links(active) WHERE deleted = false;

-- Enable RLS
ALTER TABLE public.client_view_links ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view client view links for their vagas
CREATE POLICY "Users can view client view links for accessible vagas"
  ON public.client_view_links
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = client_view_links.vaga_id
        AND (v.recrutador_id = auth.uid() OR v.cs_id = auth.uid())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Policy: Authenticated users can create client view links for their vagas
CREATE POLICY "Users can create client view links for their vagas"
  ON public.client_view_links
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = client_view_links.vaga_id
        AND (v.recrutador_id = auth.uid() OR v.cs_id = auth.uid())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Policy: Authenticated users can update their own client view links
CREATE POLICY "Users can update client view links for their vagas"
  ON public.client_view_links
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.vagas v
        WHERE v.id = client_view_links.vaga_id
        AND (v.recrutador_id = auth.uid() OR v.cs_id = auth.uid())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Policy: Admins can delete client view links
CREATE POLICY "Admins can delete client view links"
  ON public.client_view_links
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
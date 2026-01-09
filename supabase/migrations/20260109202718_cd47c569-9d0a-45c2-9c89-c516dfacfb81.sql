-- Add new columns for DISC and interview recording
ALTER TABLE public.candidatos
  ADD COLUMN IF NOT EXISTS disc_url TEXT,
  ADD COLUMN IF NOT EXISTS gravacao_entrevista_url TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.candidatos.disc_url IS 'Path do arquivo DISC no bucket de storage';
COMMENT ON COLUMN public.candidatos.gravacao_entrevista_url IS 'URL externa da gravação da entrevista';

-- Create bucket for DISC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('disc-documents', 'disc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can read DISC documents
CREATE POLICY "Authenticated users can read DISC documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'disc-documents');

-- RLS: Authenticated users can upload DISC documents
CREATE POLICY "Authenticated users can upload DISC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'disc-documents');

-- RLS: Authenticated users can delete DISC documents
CREATE POLICY "Authenticated users can delete DISC documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'disc-documents');
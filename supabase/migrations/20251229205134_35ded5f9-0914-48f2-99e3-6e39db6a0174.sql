-- Criar bucket para portfolios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolios', 'portfolios', true, 20971520, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
ON CONFLICT (id) DO NOTHING;

-- Política para upload público de portfolios (via edge function com service role)
CREATE POLICY "Public can view portfolios"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios');

CREATE POLICY "Service role can upload portfolios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolios');
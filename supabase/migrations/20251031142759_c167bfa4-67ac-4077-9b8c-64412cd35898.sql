-- Criar buckets para currículos e portfólios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('curriculos', 'curriculos', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('portfolios', 'portfolios', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed']);

-- Políticas RLS para bucket de currículos
CREATE POLICY "Usuários autenticados podem fazer upload de currículos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'curriculos');

CREATE POLICY "Usuários autenticados podem visualizar currículos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curriculos');

CREATE POLICY "Usuários autenticados podem atualizar currículos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'curriculos');

CREATE POLICY "Usuários autenticados podem deletar currículos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'curriculos');

-- Políticas RLS para bucket de portfólios
CREATE POLICY "Usuários autenticados podem fazer upload de portfólios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'portfolios');

CREATE POLICY "Usuários autenticados podem visualizar portfólios"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'portfolios');

CREATE POLICY "Usuários autenticados podem atualizar portfólios"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'portfolios');

CREATE POLICY "Usuários autenticados podem deletar portfólios"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'portfolios');

-- Adicionar novos campos à tabela candidatos
ALTER TABLE public.candidatos
ADD COLUMN curriculo_url TEXT,
ADD COLUMN portfolio_url TEXT,
ADD COLUMN disponibilidade_mudanca BOOLEAN,
ADD COLUMN pontos_fortes TEXT,
ADD COLUMN pontos_desenvolver TEXT,
ADD COLUMN parecer_final TEXT;

-- Migrar dados existentes de curriculo_link para curriculo_url (se houver)
UPDATE public.candidatos
SET curriculo_url = curriculo_link
WHERE curriculo_link IS NOT NULL AND curriculo_link != '';

-- Comentário para indicar que curriculo_link será removido em uma futura migração
COMMENT ON COLUMN public.candidatos.curriculo_link IS 'DEPRECATED: Use curriculo_url instead';
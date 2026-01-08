
-- Adicionar campo cs_responsavel_id na tabela empresas
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS cs_responsavel_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_empresas_cs_responsavel ON empresas(cs_responsavel_id);

-- Criar tabela empresa_notes
CREATE TABLE IF NOT EXISTS empresa_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  documento_url TEXT,
  documento_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresa_notes_empresa_id ON empresa_notes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_notes_created_at ON empresa_notes(created_at DESC);

-- Habilitar RLS
ALTER TABLE empresa_notes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (usuários internos: admin, recrutador, cs)
CREATE POLICY "Usuários internos podem ver anotações de empresas"
  ON empresa_notes FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR 
    has_role(auth.uid(), 'cs'::app_role)
  );

CREATE POLICY "Usuários internos podem inserir anotações de empresas"
  ON empresa_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'recrutador'::app_role) OR 
      has_role(auth.uid(), 'cs'::app_role)
    )
  );

-- Criar bucket para documentos de empresas (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-documentos', 'empresa-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para empresa-documentos
CREATE POLICY "Usuários internos podem ver documentos de empresas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'empresa-documentos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR 
    has_role(auth.uid(), 'cs'::app_role)
  )
);

CREATE POLICY "Usuários internos podem fazer upload de documentos de empresas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'empresa-documentos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR 
    has_role(auth.uid(), 'cs'::app_role)
  )
);

CREATE POLICY "Usuários internos podem deletar documentos de empresas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'empresa-documentos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recrutador'::app_role) OR 
    has_role(auth.uid(), 'cs'::app_role)
  )
);

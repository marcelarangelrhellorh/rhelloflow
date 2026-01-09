-- Tabela para registrar consentimentos LGPD
CREATE TABLE IF NOT EXISTS public.data_processing_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_processing',
    'marketing_communications', 
    'talent_pool_inclusion',
    'data_sharing_with_clients'
  )),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_withdrawn_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT NOT NULL CHECK (source IN (
    'public_form',
    'talent_pool_form',
    'direct_registration',
    'import',
    'candidate_registration_form'
  )),
  form_version TEXT DEFAULT '1.0',
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent',
    'legitimate_interest',
    'contract_execution'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(candidato_id, consent_type)
);

-- Index para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_consents_candidato ON data_processing_consents(candidato_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON data_processing_consents(consent_type);

-- RLS
ALTER TABLE data_processing_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Admin e recrutadores podem ver todos os consentimentos
CREATE POLICY "Admin and recruiters can read all consents" ON data_processing_consents
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'recrutador', 'cs'))
  );

-- Policy: Inserção pública (para formulários)
CREATE POLICY "Anyone can insert consents" ON data_processing_consents
  FOR INSERT WITH CHECK (true);

-- Policy: Admin pode atualizar consentimentos
CREATE POLICY "Admin can update consents" ON data_processing_consents
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'recrutador'))
  );

-- Trigger para updated_at
CREATE TRIGGER update_consents_updated_at
  BEFORE UPDATE ON data_processing_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar colunas LGPD nos candidatos
ALTER TABLE candidatos 
ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lgpd_export_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lgpd_deletion_requested_at TIMESTAMPTZ;

-- Enable realtime for consents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_processing_consents;
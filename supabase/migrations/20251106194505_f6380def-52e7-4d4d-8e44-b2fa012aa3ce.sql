-- Tabela para armazenar imports temporários de PDF
CREATE TABLE IF NOT EXISTS public.pdf_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Arquivo original
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_path TEXT,
  
  -- Dados extraídos
  extracted_data JSONB NOT NULL,
  global_confidence NUMERIC(3,2),
  
  -- Status do processamento
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'accepted', 'rejected')),
  error_message TEXT,
  
  -- Associação
  source_type TEXT NOT NULL CHECK (source_type IN ('vaga', 'banco_talentos')),
  vaga_id UUID,
  
  -- Candidato criado (se aceito)
  candidato_id UUID,
  accepted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT fk_vaga_id FOREIGN KEY (vaga_id) REFERENCES public.vagas(id) ON DELETE SET NULL,
  CONSTRAINT fk_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id) ON DELETE SET NULL
);

-- RLS Policies
ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recrutadores podem ver seus próprios imports"
  ON public.pdf_imports FOR SELECT
  USING (
    auth.uid() = created_by 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Recrutadores podem criar imports"
  ON public.pdf_imports FOR INSERT
  WITH CHECK (
    auth.uid() = created_by 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  );

CREATE POLICY "Recrutadores podem atualizar seus imports"
  ON public.pdf_imports FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem deletar imports"
  ON public.pdf_imports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_pdf_imports_created_by ON public.pdf_imports(created_by);
CREATE INDEX idx_pdf_imports_status ON public.pdf_imports(status);
CREATE INDEX idx_pdf_imports_expires_at ON public.pdf_imports(expires_at);
CREATE INDEX idx_pdf_imports_vaga_id ON public.pdf_imports(vaga_id);

-- Função para limpar imports expirados automaticamente
CREATE OR REPLACE FUNCTION public.cleanup_expired_pdf_imports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import RECORD;
BEGIN
  -- Buscar imports expirados
  FOR v_import IN
    SELECT id, storage_path
    FROM public.pdf_imports
    WHERE expires_at < NOW()
      AND status NOT IN ('accepted', 'rejected')
  LOOP
    -- Deletar arquivo do storage se existir
    IF v_import.storage_path IS NOT NULL THEN
      PERFORM storage.delete(v_import.storage_path);
    END IF;
    
    -- Deletar registro
    DELETE FROM public.pdf_imports WHERE id = v_import.id;
  END LOOP;
END;
$$;

-- Trigger para deletar arquivo do storage ao deletar import
CREATE OR REPLACE FUNCTION public.delete_pdf_import_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL THEN
    PERFORM storage.delete(OLD.storage_path);
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_delete_pdf_import_file
  BEFORE DELETE ON public.pdf_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_pdf_import_file();

-- Bucket para PDFs temporários (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-imports',
  'pdf-imports',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Policies do storage bucket
CREATE POLICY "Recrutadores podem fazer upload de PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-imports'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  );

CREATE POLICY "Recrutadores podem acessar seus PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-imports'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
  );

CREATE POLICY "Sistema pode deletar PDFs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdf-imports');
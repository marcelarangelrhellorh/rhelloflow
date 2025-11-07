-- Adicionar novos campos na tabela candidatos
ALTER TABLE public.candidatos
ADD COLUMN IF NOT EXISTS idade INTEGER,
ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('M', 'F', 'Outro', 'Masculino', 'Feminino', NULL)),
ADD COLUMN IF NOT EXISTS experiencia_profissional TEXT,
ADD COLUMN IF NOT EXISTS idiomas TEXT;

-- Criar tipo enum para origem_candidatura com as novas opções
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_candidatura') THEN
    CREATE TYPE origem_candidatura AS ENUM (
      'linkedin', 
      'infojobs', 
      'catho', 
      'indicacao', 
      'site_empresa', 
      'importacao_xls',
      'outro'
    );
  END IF;
END
$$;

-- Adicionar comentário nos campos
COMMENT ON COLUMN public.candidatos.idade IS 'Idade do candidato em anos';
COMMENT ON COLUMN public.candidatos.sexo IS 'Sexo do candidato: M (Masculino), F (Feminino), Outro';
COMMENT ON COLUMN public.candidatos.experiencia_profissional IS 'Histórico de experiência profissional detalhado';
COMMENT ON COLUMN public.candidatos.idiomas IS 'Idiomas que o candidato conhece e seus níveis';

-- Criar tabela de logs de importação
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('vaga', 'banco_talentos')),
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE SET NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  ignored_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  import_mode TEXT NOT NULL CHECK (import_mode IN ('all', 'skip_duplicates', 'update_existing')) DEFAULT 'all',
  dedup_field TEXT NOT NULL CHECK (dedup_field IN ('email', 'telefone')) DEFAULT 'email',
  results JSONB,
  duplicates_found JSONB,
  processing_time_ms INTEGER,
  CONSTRAINT valid_counts CHECK (
    success_count + error_count + ignored_count + updated_count <= total_rows
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_import_logs_created_by ON public.import_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_logs_vaga_id ON public.import_logs(vaga_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidatos_idade ON public.candidatos(idade) WHERE idade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidatos_sexo ON public.candidatos(sexo) WHERE sexo IS NOT NULL;

-- RLS para import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import logs"
  ON public.import_logs FOR SELECT
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert import logs"
  ON public.import_logs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can view all import logs"
  ON public.import_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Comentários na tabela
COMMENT ON TABLE public.import_logs IS 'Registro de todas as importações em massa de candidatos';
COMMENT ON COLUMN public.import_logs.dedup_field IS 'Campo usado para detecção de duplicados: email ou telefone';
COMMENT ON COLUMN public.import_logs.import_mode IS 'Modo de importação: all (todos), skip_duplicates (ignorar), update_existing (atualizar)';
COMMENT ON COLUMN public.import_logs.duplicates_found IS 'JSON com detalhes dos duplicados encontrados durante a importação';
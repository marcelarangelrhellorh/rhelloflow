-- Adicionar campos da Receita Federal na tabela empresas

-- Campos simples
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS data_situacao_cadastral TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS data_abertura TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS natureza_juridica TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS capital_social NUMERIC;

-- Campos JSONB para dados complexos
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS atividade_principal JSONB DEFAULT '[]';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS atividades_secundarias JSONB DEFAULT '[]';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS quadro_societario JSONB DEFAULT '[]';

-- Timestamp da última consulta CNPJ
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cnpj_consultado_em TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_situacao ON public.empresas (situacao_cadastral);
CREATE INDEX IF NOT EXISTS idx_empresas_atividade_principal ON public.empresas USING GIN (atividade_principal);
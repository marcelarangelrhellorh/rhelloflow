-- Expandir tabela empresas com campos CRM
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS setor TEXT,
ADD COLUMN IF NOT EXISTS porte TEXT CHECK (porte IN ('Micro', 'Pequena', 'Média', 'Grande')),
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS site TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS contato_principal_nome TEXT,
ADD COLUMN IF NOT EXISTS contato_principal_cargo TEXT,
ADD COLUMN IF NOT EXISTS contato_principal_email TEXT,
ADD COLUMN IF NOT EXISTS contato_principal_telefone TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'prospect')),
ADD COLUMN IF NOT EXISTS data_primeiro_contato TIMESTAMPTZ DEFAULT NOW();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_status ON public.empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas(nome);

-- Comentários para documentação
COMMENT ON COLUMN public.empresas.setor IS 'Setor/indústria da empresa';
COMMENT ON COLUMN public.empresas.porte IS 'Porte da empresa: Micro, Pequena, Média ou Grande';
COMMENT ON COLUMN public.empresas.status IS 'Status do relacionamento: ativo, inativo ou prospect';
COMMENT ON COLUMN public.empresas.data_primeiro_contato IS 'Data do primeiro contato com a empresa';
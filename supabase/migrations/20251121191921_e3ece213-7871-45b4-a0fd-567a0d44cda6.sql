-- ETAPA 1: Criar tabela de empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas para empresas (sem referência a empresa_id ainda)
CREATE POLICY "Admins podem gerenciar todas as empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ETAPA 2: Migrar dados existentes - criar empresas únicas
INSERT INTO public.empresas (nome)
SELECT DISTINCT empresa
FROM profiles
WHERE empresa IS NOT NULL AND empresa != ''
ON CONFLICT DO NOTHING;

-- ETAPA 3: Adicionar campos empresa_id
ALTER TABLE public.profiles
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

ALTER TABLE public.vagas
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- ETAPA 4: Popular empresa_id em profiles
UPDATE public.profiles p
SET empresa_id = (
  SELECT e.id 
  FROM public.empresas e 
  WHERE e.nome = p.empresa
  LIMIT 1
)
WHERE p.empresa IS NOT NULL;

-- ETAPA 5: Popular empresa_id em vagas usando cliente_id
UPDATE public.vagas v
SET empresa_id = (
  SELECT p.empresa_id 
  FROM public.profiles p 
  WHERE p.id = v.cliente_id
  LIMIT 1
)
WHERE v.cliente_id IS NOT NULL;

-- Popular empresa_id em vagas usando campo empresa (texto)
UPDATE public.vagas v
SET empresa_id = (
  SELECT e.id 
  FROM public.empresas e 
  WHERE e.nome = v.empresa
  LIMIT 1
)
WHERE v.empresa_id IS NULL AND v.empresa IS NOT NULL;

-- ETAPA 6: Criar índices
CREATE INDEX idx_profiles_empresa_id ON public.profiles(empresa_id);
CREATE INDEX idx_vagas_empresa_id ON public.vagas(empresa_id);

-- ETAPA 7: Agora criar política RLS para clientes verem sua empresa
CREATE POLICY "Clientes podem ver sua própria empresa"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT empresa_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- ETAPA 8: Atualizar política de vagas
DROP POLICY IF EXISTS "Clientes podem ver suas próprias vagas" ON public.vagas;

CREATE POLICY "Clientes podem ver vagas da sua empresa"
ON public.vagas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND empresa_id IN (
    SELECT empresa_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- ETAPA 9: Trigger para updated_at
CREATE OR REPLACE FUNCTION update_empresas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION update_empresas_updated_at();
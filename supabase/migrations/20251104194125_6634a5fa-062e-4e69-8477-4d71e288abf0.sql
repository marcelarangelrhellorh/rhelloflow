-- Tabela principal do estudo (registro e resultado bruto)
CREATE TABLE IF NOT EXISTS public.estudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente TEXT,
  funcao TEXT NOT NULL,
  senioridade TEXT CHECK (senioridade IN ('Junior','Pleno','Senior','Coordenacao')),
  cidade TEXT,
  uf CHAR(2),
  modelo_trabalho TEXT CHECK (modelo_trabalho IN ('Presencial','Hibrido','Remoto')),
  setor TEXT,
  porte TEXT CHECK (porte IN ('Startup','PME','Corporativo')),
  salario_cliente NUMERIC,
  beneficios_cliente TEXT[] DEFAULT '{}',
  fontes_solicitadas TEXT[] DEFAULT '{}',
  observacoes TEXT,
  resultado JSONB,
  periodo TEXT
);

-- Faixas salariais (normalizado por nível)
CREATE TABLE IF NOT EXISTS public.faixas_salariais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudo_id UUID NOT NULL REFERENCES public.estudos(id) ON DELETE CASCADE,
  nivel TEXT NOT NULL CHECK (nivel IN ('Junior','Pleno','Senior')),
  salario_min NUMERIC,
  salario_med NUMERIC,
  salario_max NUMERIC,
  fontes TEXT[] DEFAULT '{}'
);

-- Benefícios agregados por estudo
CREATE TABLE IF NOT EXISTS public.beneficios_mercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudo_id UUID NOT NULL REFERENCES public.estudos(id) ON DELETE CASCADE,
  recorrentes TEXT[] DEFAULT '{}',
  diferenciais TEXT[] DEFAULT '{}'
);

-- Fontes consultadas efetivamente
CREATE TABLE IF NOT EXISTS public.fontes_consultadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudo_id UUID NOT NULL REFERENCES public.estudos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  periodo TEXT,
  url TEXT
);

-- View para acelerar benchmark por recorte
CREATE OR REPLACE VIEW public.vw_benchmark_recorte AS
SELECT
  lower(funcao) as funcao_norm,
  senioridade,
  cidade,
  uf,
  setor,
  porte,
  avg(coalesce((resultado->'faixa_salarial'->'pleno'->>'med')::numeric, salario_cliente)) as media_salario_pleno,
  count(*) as qtd_estudos
FROM public.estudos
GROUP BY 1,2,3,4,5,6;

-- RLS Policies
ALTER TABLE public.estudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faixas_salariais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios_mercado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fontes_consultadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view estudos"
  ON public.estudos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert estudos"
  ON public.estudos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view faixas"
  ON public.faixas_salariais FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert faixas"
  ON public.faixas_salariais FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view beneficios"
  ON public.beneficios_mercado FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert beneficios"
  ON public.beneficios_mercado FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view fontes"
  ON public.fontes_consultadas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert fontes"
  ON public.fontes_consultadas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
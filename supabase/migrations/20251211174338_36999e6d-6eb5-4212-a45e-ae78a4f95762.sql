-- Tabela para armazenar benchmarks salariais de consultorias
CREATE TABLE public.salary_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'hays', 'michael_page', 'robert_half'
  year INTEGER NOT NULL DEFAULT 2025,
  page_number INTEGER,
  cargo_original TEXT,
  cargo_canonico TEXT NOT NULL,
  setor TEXT,
  senioridade TEXT,
  porte_empresa TEXT, -- 'pequeno', 'medio', 'grande'
  fixo_min NUMERIC,
  fixo_max NUMERIC,
  trecho_origem TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_salary_benchmarks_cargo ON public.salary_benchmarks(cargo_canonico);
CREATE INDEX idx_salary_benchmarks_source ON public.salary_benchmarks(source);
CREATE INDEX idx_salary_benchmarks_setor ON public.salary_benchmarks(setor);
CREATE INDEX idx_salary_benchmarks_cargo_setor ON public.salary_benchmarks(cargo_canonico, setor);

-- Enable RLS
ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - dados de leitura para usuários autenticados
CREATE POLICY "Authenticated users can view salary benchmarks"
ON public.salary_benchmarks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins podem inserir/atualizar dados
CREATE POLICY "Admins can manage salary benchmarks"
ON public.salary_benchmarks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Comentário na tabela
COMMENT ON TABLE public.salary_benchmarks IS 'Dados de benchmarks salariais de consultorias como Hays, Michael Page, Robert Half';
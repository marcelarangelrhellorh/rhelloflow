-- ============================================
-- FASE 1: Otimizações de Banco de Dados para Estudo de Mercado
-- ============================================

-- 1.1 Adicionar coluna search_vector para Full-Text Search
ALTER TABLE public.salary_benchmarks 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 1.2 Criar índice GIN para Full-Text Search (100x mais rápido que ILIKE)
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_fts 
ON public.salary_benchmarks USING GIN(search_vector);

-- 1.3 Criar índices adicionais para otimização
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_source_setor 
ON public.salary_benchmarks(source, setor);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_cargo_canonico 
ON public.salary_benchmarks(cargo_canonico);

-- 1.4 Função para atualizar search_vector automaticamente
CREATE OR REPLACE FUNCTION public.update_salary_benchmarks_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', 
    COALESCE(NEW.cargo_canonico, '') || ' ' || 
    COALESCE(NEW.cargo_original, '') || ' ' ||
    COALESCE(NEW.setor, '')
  );
  RETURN NEW;
END;
$$;

-- 1.5 Trigger para manter search_vector atualizado
DROP TRIGGER IF EXISTS trg_salary_benchmarks_search_vector ON public.salary_benchmarks;
CREATE TRIGGER trg_salary_benchmarks_search_vector
BEFORE INSERT OR UPDATE ON public.salary_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_salary_benchmarks_search_vector();

-- 1.6 Atualizar registros existentes com search_vector
UPDATE public.salary_benchmarks
SET search_vector = to_tsvector('portuguese', 
  COALESCE(cargo_canonico, '') || ' ' || 
  COALESCE(cargo_original, '') || ' ' ||
  COALESCE(setor, '')
);

-- 1.7 Corrigir registros com setor NULL usando mapeamento de página
-- Hays 2026 page mapping
UPDATE public.salary_benchmarks
SET setor = CASE page_number
  WHEN 17 THEN 'Engenharia' WHEN 18 THEN 'Engenharia' WHEN 19 THEN 'Engenharia' WHEN 20 THEN 'Engenharia'
  WHEN 21 THEN 'Ciências da Vida' WHEN 22 THEN 'Ciências da Vida' WHEN 23 THEN 'Ciências da Vida'
  WHEN 24 THEN 'Tecnologia' WHEN 25 THEN 'Tecnologia' WHEN 26 THEN 'Tecnologia' 
  WHEN 27 THEN 'Tecnologia' WHEN 28 THEN 'Tecnologia'
  WHEN 29 THEN 'Tecnologia' WHEN 30 THEN 'Tecnologia' WHEN 31 THEN 'Tecnologia' 
  WHEN 32 THEN 'Tecnologia' WHEN 33 THEN 'Tecnologia'
  WHEN 34 THEN 'Finanças e Contabilidade' 
  WHEN 35 THEN 'Recursos Humanos' 
  WHEN 36 THEN 'Supply Chain'
  ELSE setor
END
WHERE source = 'hays' AND setor IS NULL AND page_number IS NOT NULL;

-- Michael Page 2026 page mapping
UPDATE public.salary_benchmarks
SET setor = CASE 
  WHEN page_number BETWEEN 28 AND 32 THEN 'Bancos e Serviços Financeiros'
  WHEN page_number BETWEEN 33 AND 38 THEN 'Engenharia e Manufatura'
  WHEN page_number BETWEEN 39 AND 45 THEN 'Finanças e Contabilidade'
  WHEN page_number BETWEEN 46 AND 49 THEN 'Healthcare & Life Sciences'
  WHEN page_number BETWEEN 50 AND 52 THEN 'Jurídico'
  WHEN page_number BETWEEN 53 AND 57 THEN 'Marketing'
  WHEN page_number BETWEEN 58 AND 60 THEN 'Propriedade e Construção'
  WHEN page_number BETWEEN 61 AND 64 THEN 'Recursos Humanos'
  WHEN page_number BETWEEN 65 AND 75 THEN 'Seguros'
  WHEN page_number BETWEEN 76 AND 82 THEN 'Secretariado e Business Support'
  WHEN page_number BETWEEN 83 AND 87 THEN 'Supply Chain e Procurement'
  WHEN page_number BETWEEN 88 AND 92 THEN 'Vendas'
  ELSE setor
END
WHERE source = 'michael_page' AND setor IS NULL AND page_number IS NOT NULL;

-- ============================================
-- FASE 2: Função de Agregação SQL para Performance
-- ============================================

-- 2.1 Criar função de busca e agregação otimizada
CREATE OR REPLACE FUNCTION public.get_salary_benchmarks_aggregated(
  p_cargo text,
  p_senioridade text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE(
  source text,
  setor text,
  porte_empresa text,
  min_salary numeric,
  max_salary numeric,
  avg_salary numeric,
  record_count int,
  sample_trecho text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_search_query tsquery;
  v_cargo_normalized text;
BEGIN
  -- Normalizar cargo para busca
  v_cargo_normalized := lower(
    translate(p_cargo, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')
  );
  
  -- Criar query de busca
  v_search_query := plainto_tsquery('portuguese', v_cargo_normalized);
  
  RETURN QUERY
  WITH ranked_results AS (
    SELECT 
      sb.source,
      COALESCE(sb.setor, 'Geral') as setor,
      sb.porte_empresa,
      sb.fixo_min,
      sb.fixo_max,
      sb.trecho_origem,
      ts_rank(sb.search_vector, v_search_query) as rank_score
    FROM public.salary_benchmarks sb
    WHERE sb.search_vector @@ v_search_query
      OR sb.cargo_canonico ILIKE '%' || v_cargo_normalized || '%'
    ORDER BY rank_score DESC
    LIMIT p_limit
  )
  SELECT 
    rr.source::text,
    rr.setor::text,
    rr.porte_empresa::text,
    MIN(rr.fixo_min)::numeric as min_salary,
    MAX(rr.fixo_max)::numeric as max_salary,
    AVG((rr.fixo_min + rr.fixo_max) / 2)::numeric as avg_salary,
    COUNT(*)::int as record_count,
    (array_agg(rr.trecho_origem ORDER BY rr.rank_score DESC))[1]::text as sample_trecho
  FROM ranked_results rr
  GROUP BY rr.source, rr.setor, rr.porte_empresa
  ORDER BY rr.source, rr.setor, rr.porte_empresa;
END;
$$;

-- ============================================
-- FASE 4: Cache de Estudos de Mercado
-- ============================================

-- 4.1 Criar tabela de cache para estudos
CREATE TABLE IF NOT EXISTS public.salary_study_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  cargo text NOT NULL,
  senioridade text,
  localidade text,
  resultado jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- 4.2 Índice para busca rápida por cache_key
CREATE INDEX IF NOT EXISTS idx_salary_study_cache_key 
ON public.salary_study_cache(cache_key);

-- 4.3 Índice para limpeza de expirados
CREATE INDEX IF NOT EXISTS idx_salary_study_cache_expires 
ON public.salary_study_cache(expires_at);

-- 4.4 Função para gerar cache_key consistente
CREATE OR REPLACE FUNCTION public.generate_salary_study_cache_key(
  p_cargo text,
  p_senioridade text DEFAULT NULL,
  p_localidade text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT md5(
    lower(trim(COALESCE(p_cargo, ''))) || '|' ||
    lower(trim(COALESCE(p_senioridade, ''))) || '|' ||
    lower(trim(COALESCE(p_localidade, '')))
  );
$$;

-- 4.5 Função para limpar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_salary_study_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.salary_study_cache
  WHERE expires_at < now();
END;
$$;

-- 4.6 RLS para cache (apenas leitura pública, escrita via service role)
ALTER TABLE public.salary_study_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache é público para leitura"
ON public.salary_study_cache FOR SELECT
USING (true);

CREATE POLICY "Apenas service role pode inserir cache"
ON public.salary_study_cache FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Apenas service role pode deletar cache"
ON public.salary_study_cache FOR DELETE
USING (auth.role() = 'service_role');
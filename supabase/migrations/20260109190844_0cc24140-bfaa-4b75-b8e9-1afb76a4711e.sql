-- Criar tabela de sinônimos de cargo
CREATE TABLE public.cargo_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_principal TEXT NOT NULL,
  sinonimos TEXT[] NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas rápidas
CREATE INDEX idx_cargo_synonyms_termo ON cargo_synonyms(lower(termo_principal));
CREATE INDEX idx_cargo_synonyms_sinonimos ON cargo_synonyms USING GIN(sinonimos);

-- RLS - permitir leitura para usuários autenticados
ALTER TABLE public.cargo_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read synonyms" ON public.cargo_synonyms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage synonyms" ON public.cargo_synonyms
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Popular com sinônimos iniciais
INSERT INTO cargo_synonyms (termo_principal, sinonimos, categoria) VALUES
('logística', ARRAY['supply chain', 'suprimentos', 'cadeia de suprimentos', 'supply', 'logistics', 'armazem', 'armazém', 'distribuição', 'transporte'], 'Supply Chain'),
('supply chain', ARRAY['logística', 'logistica', 'suprimentos', 'cadeia de suprimentos', 'supply', 'logistics'], 'Supply Chain'),
('suprimentos', ARRAY['logística', 'logistica', 'supply chain', 'cadeia de suprimentos', 'supply', 'procurement', 'compras'], 'Supply Chain'),
('compras', ARRAY['procurement', 'purchasing', 'suprimentos', 'sourcing', 'buyer'], 'Compras'),
('comercial', ARRAY['vendas', 'sales', 'negócios', 'business development', 'key account', 'trade'], 'Comercial'),
('vendas', ARRAY['comercial', 'sales', 'negócios', 'business development', 'trade'], 'Comercial'),
('financeiro', ARRAY['finanças', 'finance', 'controladoria', 'tesouraria', 'fp&a', 'fpa', 'contabilidade'], 'Financeiro'),
('contabilidade', ARRAY['financeiro', 'finanças', 'finance', 'controladoria', 'accounting', 'fiscal', 'tributário'], 'Financeiro'),
('recursos humanos', ARRAY['rh', 'hr', 'human resources', 'gestão de pessoas', 'people', 'talent', 'dp', 'departamento pessoal'], 'RH'),
('rh', ARRAY['recursos humanos', 'hr', 'human resources', 'gestão de pessoas', 'people', 'talent'], 'RH'),
('tecnologia', ARRAY['ti', 'it', 'tech', 'desenvolvimento', 'software', 'sistemas', 'technology', 'digital'], 'Tecnologia'),
('ti', ARRAY['tecnologia', 'it', 'tech', 'desenvolvimento', 'software', 'sistemas', 'technology'], 'Tecnologia'),
('marketing', ARRAY['mkt', 'comunicação', 'branding', 'digital marketing', 'trade marketing', 'produto'], 'Marketing'),
('engenharia', ARRAY['engineering', 'projetos', 'industrial', 'manutenção', 'produção'], 'Engenharia'),
('jurídico', ARRAY['legal', 'direito', 'compliance', 'regulatório', 'contratos'], 'Jurídico'),
('operações', ARRAY['operations', 'produção', 'manufacturing', 'industrial', 'fábrica', 'planta'], 'Operações');

-- Atualizar função get_salary_benchmarks_aggregated com suporte a sinônimos
CREATE OR REPLACE FUNCTION public.get_salary_benchmarks_aggregated(
  p_cargo text,
  p_senioridade text DEFAULT NULL::text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  source text,
  setor text,
  porte_empresa text,
  min_salary numeric,
  max_salary numeric,
  avg_salary numeric,
  record_count integer,
  sample_trecho text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_search_query tsquery;
  v_cargo_normalized text;
  v_expanded_terms text[];
  v_term text;
BEGIN
  -- Normalizar cargo para busca
  v_cargo_normalized := lower(
    translate(p_cargo, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')
  );
  
  -- Buscar sinônimos na tabela
  SELECT array_agg(DISTINCT unnested_term)
  INTO v_expanded_terms
  FROM (
    -- Termo original
    SELECT v_cargo_normalized as unnested_term
    UNION
    -- Sinônimos quando o termo buscado contém o termo principal
    SELECT unnest(cs.sinonimos) as unnested_term
    FROM cargo_synonyms cs
    WHERE v_cargo_normalized ILIKE '%' || lower(translate(cs.termo_principal, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    UNION
    -- Termo principal quando o termo buscado está nos sinônimos
    SELECT lower(translate(cs.termo_principal, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) as unnested_term
    FROM cargo_synonyms cs
    WHERE EXISTS (
      SELECT 1 FROM unnest(cs.sinonimos) s 
      WHERE v_cargo_normalized ILIKE '%' || lower(translate(s, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    )
    UNION
    -- Todos os sinônimos do grupo quando o termo está em algum sinônimo
    SELECT unnest(cs.sinonimos) as unnested_term
    FROM cargo_synonyms cs
    WHERE EXISTS (
      SELECT 1 FROM unnest(cs.sinonimos) s 
      WHERE v_cargo_normalized ILIKE '%' || lower(translate(s, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    )
  ) expanded;
  
  -- Se não encontrou sinônimos, usar apenas o termo original
  IF v_expanded_terms IS NULL OR array_length(v_expanded_terms, 1) IS NULL THEN
    v_expanded_terms := ARRAY[v_cargo_normalized];
  END IF;
  
  -- Criar query de busca FTS
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
      -- Busca ILIKE para todos os termos expandidos
      OR EXISTS (
        SELECT 1 FROM unnest(v_expanded_terms) term
        WHERE sb.cargo_canonico ILIKE '%' || term || '%'
      )
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

-- Criar função auxiliar para retornar os termos expandidos (para uso na UI)
CREATE OR REPLACE FUNCTION public.get_expanded_search_terms(p_cargo text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cargo_normalized text;
  v_expanded_terms text[];
BEGIN
  v_cargo_normalized := lower(
    translate(p_cargo, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')
  );
  
  SELECT array_agg(DISTINCT unnested_term)
  INTO v_expanded_terms
  FROM (
    SELECT v_cargo_normalized as unnested_term
    UNION
    SELECT unnest(cs.sinonimos) as unnested_term
    FROM cargo_synonyms cs
    WHERE v_cargo_normalized ILIKE '%' || lower(translate(cs.termo_principal, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    UNION
    SELECT lower(translate(cs.termo_principal, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) as unnested_term
    FROM cargo_synonyms cs
    WHERE EXISTS (
      SELECT 1 FROM unnest(cs.sinonimos) s 
      WHERE v_cargo_normalized ILIKE '%' || lower(translate(s, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    )
    UNION
    SELECT unnest(cs.sinonimos) as unnested_term
    FROM cargo_synonyms cs
    WHERE EXISTS (
      SELECT 1 FROM unnest(cs.sinonimos) s 
      WHERE v_cargo_normalized ILIKE '%' || lower(translate(s, 'áàãâäéèêëíìîïóòõôöúùûü', 'aaaaaeeeeiiiiooooouuuu')) || '%'
    )
  ) expanded;
  
  RETURN COALESCE(v_expanded_terms, ARRAY[v_cargo_normalized]);
END;
$$;
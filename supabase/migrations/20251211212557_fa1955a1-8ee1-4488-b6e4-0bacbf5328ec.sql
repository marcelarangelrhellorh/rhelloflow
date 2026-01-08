-- Cache de resultados de comparação (TTL 1h)
CREATE TABLE public.role_comparison_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '1 hour'
);

-- Índice para limpeza de cache expirado
CREATE INDEX idx_role_comparison_cache_expires ON public.role_comparison_cache(expires_at);

-- Enable RLS
ALTER TABLE public.role_comparison_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cache (sistema pode gerenciar)
CREATE POLICY "System can manage cache"
  ON public.role_comparison_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Pesquisas salvas pelo usuário (opcional)
CREATE TABLE public.saved_role_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_ids TEXT[] NOT NULL,
  requirements JSONB NOT NULL,
  client_context TEXT,
  prompt_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por usuário
CREATE INDEX idx_saved_role_comparisons_user ON public.saved_role_comparisons(user_id);

-- Enable RLS
ALTER TABLE public.saved_role_comparisons ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver e gerenciar suas próprias pesquisas salvas
CREATE POLICY "Users can manage own saved comparisons"
  ON public.saved_role_comparisons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_role_comparison_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.role_comparison_cache
  WHERE expires_at < now();
END;
$$;
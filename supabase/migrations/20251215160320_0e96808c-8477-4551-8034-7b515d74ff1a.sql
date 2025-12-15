-- Remover política pública de leitura que expõe dados salariais
DROP POLICY IF EXISTS "Cache é público para leitura" ON public.salary_study_cache;

-- Criar nova política restrita apenas a usuários autenticados
CREATE POLICY "Authenticated users can read cache"
ON public.salary_study_cache FOR SELECT
USING (auth.uid() IS NOT NULL);
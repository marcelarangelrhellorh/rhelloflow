-- Remover política antiga que verifica role 'recruiter' em inglês
DROP POLICY IF EXISTS "Users can view recruiter profiles" ON public.profiles;

-- Criar nova política que permite usuários autenticados verem profiles de recrutadores e CS
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Adicionar comentário explicativo
COMMENT ON POLICY "Authenticated users can view all profiles" ON public.profiles IS 
'Permite que usuários autenticados vejam todos os profiles para relatórios e filtros';
-- Remover política problemática que causa recursão infinita
DROP POLICY IF EXISTS users_admin_write ON public.users;

-- Criar função SECURITY DEFINER para verificar role sem recursão
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Recriar política usando a função segura
CREATE POLICY users_admin_write ON public.users
FOR ALL 
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
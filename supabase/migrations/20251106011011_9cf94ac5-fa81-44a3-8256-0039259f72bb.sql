-- Remover políticas existentes
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

-- Criar função auxiliar para verificar se usuário pode gerenciar roles
CREATE OR REPLACE FUNCTION public.can_manage_user_roles()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role);
$$;

-- Políticas mais simples usando a função
CREATE POLICY "user_roles_insert_if_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (can_manage_user_roles());

CREATE POLICY "user_roles_update_if_admin"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (can_manage_user_roles())
WITH CHECK (can_manage_user_roles());

CREATE POLICY "user_roles_delete_if_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (can_manage_user_roles());
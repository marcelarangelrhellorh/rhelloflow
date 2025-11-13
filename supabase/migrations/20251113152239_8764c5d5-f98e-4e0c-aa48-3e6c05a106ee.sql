-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow role insertion during user creation" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Permitir que admins possam inserir roles
CREATE POLICY "Allow role insertion during user creation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Garantir que admins possam gerenciar todos os roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
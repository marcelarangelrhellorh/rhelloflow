-- Refatoração do sistema de usuários e acessos

-- 1. Criar enum para tipo de usuário
CREATE TYPE public.user_type AS ENUM ('rhello', 'external');

-- 2. Adicionar campos na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_type public.user_type DEFAULT 'rhello',
ADD COLUMN IF NOT EXISTS empresa TEXT;

-- 3. Atualizar a constraint do profiles para remover 'viewer' e 'cliente' (agora são external)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Nota: A role agora é controlada pela tabela user_roles, não pela profiles

-- 4. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON public.profiles(empresa);

-- 5. Atualizar políticas RLS para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Usuários podem ver todos os perfis do tipo rhello
CREATE POLICY "Users can view rhello profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_type = 'rhello');

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar todos os perfis
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Migrar clientes existentes para o novo modelo
-- Usuários com role 'cliente' agora são type 'external'
UPDATE public.profiles
SET user_type = 'external'
WHERE id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'cliente'
);

-- 7. Comentários para documentação
COMMENT ON COLUMN public.profiles.user_type IS 'Tipo de usuário: rhello (interno) ou external (cliente)';
COMMENT ON COLUMN public.profiles.empresa IS 'Empresa vinculada para usuários externos';
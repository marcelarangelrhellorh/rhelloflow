-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'recrutador', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Populate user_roles from existing users table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'recrutador' THEN 'recrutador'::app_role
    ELSE 'viewer'::app_role
  END
FROM public.users
WHERE active = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Drop existing permissive policies on vagas
DROP POLICY IF EXISTS "Permitir atualização de vagas para usuários autenticados" ON public.vagas;
DROP POLICY IF EXISTS "Permitir exclusão de vagas para usuários autenticados" ON public.vagas;
DROP POLICY IF EXISTS "Permitir inserção de vagas para usuários autenticados" ON public.vagas;
DROP POLICY IF EXISTS "Permitir inserção pública de vagas" ON public.vagas;
DROP POLICY IF EXISTS "Permitir leitura de vagas para usuários autenticados" ON public.vagas;

-- 7. Create restrictive RLS policies for vagas

-- Anyone can view vagas (keep current behavior for SELECT)
CREATE POLICY "Anyone authenticated can view vagas"
ON public.vagas
FOR SELECT
TO authenticated
USING (true);

-- Only admins and recruiters can insert vagas
CREATE POLICY "Only admins and recruiters can insert vagas"
ON public.vagas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recrutador')
);

-- Only admins and recruiters can update vagas
CREATE POLICY "Only admins and recruiters can update vagas"
ON public.vagas
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recrutador')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recrutador')
);

-- Only admins can delete vagas
CREATE POLICY "Only admins can delete vagas"
ON public.vagas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can modify roles
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Update handle_new_user function to also create role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into users
  INSERT INTO public.users (id, email, name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter') = 'admin' THEN 'admin'
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter') = 'recruiter' THEN 'recrutador'
      ELSE 'viewer'
    END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter') = 'admin' THEN 'admin'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter') = 'recruiter' THEN 'recrutador'::app_role
      ELSE 'viewer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
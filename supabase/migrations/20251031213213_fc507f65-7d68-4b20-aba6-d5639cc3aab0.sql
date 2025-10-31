-- 1) Criar tabela de usuários (diretório)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','recrutador','cs','viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: todos autenticados podem listar usuários ativos
CREATE POLICY users_read_directory ON public.users
FOR SELECT 
TO authenticated
USING (active = true);

-- Policy: apenas admins podem modificar usuários
CREATE POLICY users_admin_write ON public.users
FOR ALL 
TO authenticated
USING (EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
WITH CHECK (EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- 2) Adicionar colunas de referência em vagas
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS recrutador_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS cs_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- 3) Criar função para auditoria (created_by/updated_by)
CREATE OR REPLACE FUNCTION public.set_who()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger em vagas
DROP TRIGGER IF EXISTS vagas_who ON public.vagas;
CREATE TRIGGER vagas_who
BEFORE INSERT OR UPDATE ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.set_who();

-- 4) Sincronizar users quando criar profile (adaptar trigger existente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir em profiles (mantém funcionalidade existente)
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Inserir em users (novo diretório)
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Backfill inicial: criar users para perfis existentes
INSERT INTO public.users (id, email, name, role, active)
SELECT 
  p.id,
  COALESCE(au.email, p.id::text || '@sistema.local'),
  p.full_name,
  CASE 
    WHEN p.role = 'admin' THEN 'admin'
    WHEN p.role = 'recruiter' THEN 'recrutador'
    ELSE 'viewer'
  END,
  true
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
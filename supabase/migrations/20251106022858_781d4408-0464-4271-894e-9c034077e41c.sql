-- Remover constraint antiga
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint com valores corretos
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('recrutador', 'cs', 'viewer', 'admin'));

-- Atualizar a função handle_new_user para usar os valores corretos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into profiles com role padrão 'recrutador'
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into users
  INSERT INTO public.users (id, email, name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- Insert into user_roles com mapeamento correto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'admin' THEN 'admin'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'recrutador' THEN 'recrutador'::app_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'recrutador') = 'cs' THEN 'recrutador'::app_role
      ELSE 'viewer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
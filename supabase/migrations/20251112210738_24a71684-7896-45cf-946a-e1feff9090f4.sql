-- Adicionar role "client" ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Adicionar comentário explicativo
COMMENT ON TYPE public.app_role IS 'Roles do sistema: admin (acesso total), recrutador (gerencia vagas/candidatos), cs (customer success), client (usuário externo com acesso limitado)';
-- Criar usuário read-only para Looker Studio
-- Nota: A senha será gerada e você precisará anotá-la

-- Criar role read-only
CREATE ROLE looker_studio_reader WITH LOGIN PASSWORD 'LookerStudio2024!Secure';

-- Garantir acesso ao schema public
GRANT USAGE ON SCHEMA public TO looker_studio_reader;

-- Permitir SELECT em todas as tabelas atuais
GRANT SELECT ON ALL TABLES IN SCHEMA public TO looker_studio_reader;

-- Permitir SELECT em tabelas futuras (importante para quando novas tabelas forem criadas)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO looker_studio_reader;

-- Permitir acesso a sequences (para views que possam precisar)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO looker_studio_reader;

-- Comentário para documentação
COMMENT ON ROLE looker_studio_reader IS 'Read-only user for Looker Studio integration - has SELECT permissions on all public tables';
-- Adicionar novos valores ao ENUM status_candidato
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Assessment | Teste Técnico';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Entrevista';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Reprovado';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Triagem';
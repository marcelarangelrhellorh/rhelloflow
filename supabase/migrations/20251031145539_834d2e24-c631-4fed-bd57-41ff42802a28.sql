-- Adicionar novos valores ao enum status_candidato
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Reprovado Rhello';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Aprovado Rhello';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Entrevistas Solicitante';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Reprovado Solicitante';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Aprovado Solicitante';
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Contratado';

-- Comentário para documentação
COMMENT ON TYPE status_candidato IS 'Status do candidato no processo seletivo: Banco de Talentos, Selecionado, Entrevista Rhello, Reprovado Rhello, Aprovado Rhello, Entrevistas Solicitante, Reprovado Solicitante, Aprovado Solicitante, Contratado';
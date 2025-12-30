-- Primeiro, adicionar os novos valores ao ENUM status_vaga
ALTER TYPE status_vaga ADD VALUE IF NOT EXISTS 'Divulgação';
ALTER TYPE status_vaga ADD VALUE IF NOT EXISTS 'Entrevistas';
ALTER TYPE status_vaga ADD VALUE IF NOT EXISTS 'Shortlist disponível';
ALTER TYPE status_vaga ADD VALUE IF NOT EXISTS 'Concluída';
ALTER TYPE status_vaga ADD VALUE IF NOT EXISTS 'Congelada';
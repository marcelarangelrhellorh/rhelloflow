-- 1. Adicionar novo valor "Shortlist" ao enum de status de candidatos
ALTER TYPE status_candidato ADD VALUE IF NOT EXISTS 'Shortlist' AFTER 'Selecionado';
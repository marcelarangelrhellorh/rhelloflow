-- ================================================
-- LIMPEZA DO BANCO PARA PRODUÇÃO
-- Mantém: empresas, scorecard_templates, whatsapp_templates
-- ================================================

-- Fase 1: Scorecards e avaliações de candidatos
TRUNCATE TABLE scorecard_evaluations CASCADE;
TRUNCATE TABLE candidate_scorecards CASCADE;

-- Fase 2: Notas, tags e menções de candidatos
TRUNCATE TABLE candidate_notes CASCADE;
TRUNCATE TABLE candidate_tags CASCADE;
TRUNCATE TABLE mentions CASCADE;

-- Fase 3: Histórico e feedbacks
TRUNCATE TABLE historico_candidatos CASCADE;
TRUNCATE TABLE feedbacks CASCADE;
TRUNCATE TABLE feedback_requests CASCADE;

-- Fase 4: Links de compartilhamento
TRUNCATE TABLE share_link_events CASCADE;
TRUNCATE TABLE share_link_audit CASCADE;
TRUNCATE TABLE share_links CASCADE;
TRUNCATE TABLE client_view_links CASCADE;
TRUNCATE TABLE talent_pool_link_events CASCADE;
TRUNCATE TABLE talent_pool_links CASCADE;

-- Fase 5: Eventos e histórico de vagas
TRUNCATE TABLE vaga_eventos CASCADE;
TRUNCATE TABLE job_stage_history CASCADE;
TRUNCATE TABLE job_stage_notifications CASCADE;
TRUNCATE TABLE vacancy_tags CASCADE;

-- Fase 6: Tarefas
TRUNCATE TABLE tasks CASCADE;

-- Fase 7: Candidatos (principal)
TRUNCATE TABLE candidatos CASCADE;

-- Fase 8: Vagas (principal)
TRUNCATE TABLE vagas CASCADE;

-- Fase 9: Auditoria
TRUNCATE TABLE audit_events CASCADE;

-- Fase 10: Exclusões
TRUNCATE TABLE deletion_approvals CASCADE;
TRUNCATE TABLE pre_delete_snapshots CASCADE;

-- Fase 11: Notificações
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE notificacoes CASCADE;

-- Fase 12: Logs diversos
TRUNCATE TABLE pdf_imports CASCADE;
TRUNCATE TABLE import_logs CASCADE;
TRUNCATE TABLE public_job_submissions_log CASCADE;
TRUNCATE TABLE sync_logs CASCADE;
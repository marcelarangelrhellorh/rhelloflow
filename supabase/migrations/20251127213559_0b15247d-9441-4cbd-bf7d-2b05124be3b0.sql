-- =============================================
-- OTIMIZAÇÕES DE PERFORMANCE
-- =============================================

-- 1. Índice para tasks por vaga (consultas frequentes)
CREATE INDEX IF NOT EXISTS idx_tasks_vaga_id 
ON public.tasks(vaga_id) 
WHERE vaga_id IS NOT NULL;

-- 2. Índice para vagas por empresa (nova arquitetura)
CREATE INDEX IF NOT EXISTS idx_vagas_empresa_id 
ON public.vagas(empresa_id) 
WHERE empresa_id IS NOT NULL AND deleted_at IS NULL;

-- 3. Índice para vagas por cliente (consultas de clientes)
CREATE INDEX IF NOT EXISTS idx_vagas_cliente_id 
ON public.vagas(cliente_id) 
WHERE cliente_id IS NOT NULL AND deleted_at IS NULL;

-- 4. Índice para vagas por status_slug (funil de vagas)
CREATE INDEX IF NOT EXISTS idx_vagas_status_slug 
ON public.vagas(status_slug) 
WHERE deleted_at IS NULL;

-- 5. Índice composto para vagas ativas (dashboard)
CREATE INDEX IF NOT EXISTS idx_vagas_active_status 
ON public.vagas(status_slug, criado_em DESC) 
WHERE deleted_at IS NULL;

-- 6. Índice para job_stage_history por data (timeline)
CREATE INDEX IF NOT EXISTS idx_job_stage_history_changed_at 
ON public.job_stage_history(job_id, changed_at DESC);

-- 7. Índice para tasks atrasadas (dashboard de tarefas)
CREATE INDEX IF NOT EXISTS idx_tasks_overdue 
ON public.tasks(assignee_id, due_date) 
WHERE status != 'done' AND due_date IS NOT NULL;

-- 8. Atualizar estatísticas das tabelas principais
ANALYZE public.vagas;
ANALYZE public.candidatos;
ANALYZE public.tasks;
ANALYZE public.notifications;
ANALYZE public.feedbacks;
ANALYZE public.profiles;
ANALYZE public.user_roles;
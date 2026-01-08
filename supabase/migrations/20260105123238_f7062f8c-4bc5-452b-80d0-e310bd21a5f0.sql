-- Refresh das Materialized Views para atualizar KPIs após limpeza do banco

-- 1. Atualiza a view do Dashboard (cards de KPI da página principal)
SELECT refresh_dashboard_overview();

-- 2. Atualiza a view de KPIs para Relatórios
SELECT refresh_recruitment_kpis();
# Configuração do Cron Job para Refresh de KPIs

## Contexto
Os KPIs de relatórios são calculados através da materialized view `mv_recruitment_kpis`. Para manter os dados atualizados automaticamente, é necessário configurar um cron job que execute a função `refresh_recruitment_kpis()` periodicamente.

## Função de Refresh
A função `refresh_recruitment_kpis()` já está criada no banco de dados e faz o refresh completo da materialized view.

## Configuração via Supabase Dashboard

### Passo 1: Habilitar extensões necessárias
1. Acesse o Supabase Dashboard do projeto
2. Vá em **Database** → **Extensions**
3. Habilite as seguintes extensões:
   - `pg_cron` (para agendar jobs)
   - `pg_net` (se necessário fazer chamadas HTTP)

### Passo 2: Criar o Cron Job
Execute o seguinte SQL no **SQL Editor** do Supabase:

```sql
-- Configurar cron job para refresh automático de KPIs a cada hora
SELECT cron.schedule(
  'refresh-recruitment-kpis-hourly',  -- Nome do job
  '0 * * * *',                        -- Cron expression: a cada hora, no minuto 0
  $$
  SELECT refresh_recruitment_kpis();
  $$
);
```

### Passo 3: Verificar Jobs Agendados
Para ver todos os cron jobs configurados:

```sql
SELECT * FROM cron.job;
```

### Passo 4: Remover Job (se necessário)
Para remover o job:

```sql
SELECT cron.unschedule('refresh-recruitment-kpis-hourly');
```

## Cron Expression Alternativas

### A cada 30 minutos:
```sql
SELECT cron.schedule(
  'refresh-recruitment-kpis-30min',
  '*/30 * * * *',
  $$SELECT refresh_recruitment_kpis();$$
);
```

### A cada 6 horas:
```sql
SELECT cron.schedule(
  'refresh-recruitment-kpis-6h',
  '0 */6 * * *',
  $$SELECT refresh_recruitment_kpis();$$
);
```

### Diariamente às 00:00:
```sql
SELECT cron.schedule(
  'refresh-recruitment-kpis-daily',
  '0 0 * * *',
  $$SELECT refresh_recruitment_kpis();$$
);
```

## Monitoramento

### Ver execuções recentes:
```sql
SELECT 
  jobid,
  schedule,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Refresh Manual
Para atualizar os KPIs manualmente a qualquer momento:

```sql
SELECT refresh_recruitment_kpis();
```

## Performance
- **Tempo de execução**: ~300-500ms (depende do volume de dados)
- **Cache**: A view materializada mantém os dados em cache até o próximo refresh
- **Frontend**: O hook `useKPIs()` faz cache adicional por 5 minutos no React Query

## Notas Importantes
- A função `refresh_recruitment_kpis()` recalcula TODOS os KPIs
- O refresh é atômico (tudo ou nada)
- Não impacta performance do frontend (view já está calculada)
- Ideal executar fora de horário de pico se possível

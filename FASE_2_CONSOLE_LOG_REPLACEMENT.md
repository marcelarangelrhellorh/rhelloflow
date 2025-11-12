# FASE 2: Substituição de console.log por logger

## Status: ✅ PARCIALMENTE CONCLUÍDO

### Arquivos Já Atualizados (Componentes Críticos)

#### ✅ Páginas Principais (já feitas anteriormente)
- `src/pages/Relatorios.tsx` - 7 console.error substituídos
- `src/pages/Candidatos.tsx` - 3 console.error substituídos  
- `src/pages/Vagas.tsx` - 2 console.error substituídos

#### ✅ Componentes de Banco de Talentos
- `src/components/BancoTalentos/AddCandidateModal.tsx` - 2 console.error substituídos
- `src/components/BancoTalentos/LinkToJobModal.tsx` - 2 console.error substituídos

#### ✅ Componentes de Detalhes do Candidato
- `src/components/CandidatoDetalhes/CandidateTagsCard.tsx` - 3 console.error substituídos
- `src/components/CandidatoDetalhes/ClientCandidateDrawer.tsx` - 1 console.error substituído
- `src/components/CandidatoDetalhes/FeedbackList.tsx` - 2 console.error substituídos
- `src/components/CandidatoDetalhes/FeedbackModal.tsx` - 1 console.error substituído

### Arquivos Restantes para Substituir

**Total identificado**: 167 ocorrências em 63 arquivos

#### Arquivos Pendentes (Alta Prioridade)
```
src/components/CandidatoDetalhes/ProfessionalInfoCard.tsx - 5 ocorrências
src/components/CandidatoDetalhes/ScorecardEvaluation.tsx - 3 ocorrências
src/components/CandidatoDetalhes/ScorecardHistory.tsx - 2 ocorrências
src/components/CandidatoDetalhes/SendWhatsAppModal.tsx - 2 ocorrências
src/components/CandidatoDetalhes/SolicitarFeedbackModal.tsx - 2 ocorrências
src/components/CandidatoDetalhes/WhatsAppHistory.tsx - 1 ocorrência
src/components/Candidatos/CandidateModal.tsx - 3 ocorrências
src/components/ClientViewLinkManager.tsx - 4 ocorrências
src/components/Dashboard/BulkWhatsAppModal.tsx - 3 ocorrências
src/components/Dashboard/RejectedCandidatesCard.tsx - 2 ocorrências
src/components/Dashboard/SharedJobsCard.tsx - 1 ocorrência
src/components/Dashboard/SharedJobsList.tsx - 3 ocorrências
src/components/FunilVagas/AnalyzeScorecards.tsx - 4 ocorrências (inclui 2 console.log)
src/components/FunilVagas/CompareCandidatesModal.tsx - 6 ocorrências (inclui console.log)
src/components/FunilVagas/JobDrawer.tsx - 1 ocorrência
```

#### Outros Componentes
- ImportPdfModal, ShareJobModal, VagaForm, ProcessTimeline
- Páginas: AuditLog, BancoTalentos, CandidatoDetalhes, CandidatoForm, ClientView
- Hooks: useCandidatos, useVaga, useVagaEventos, etc.
- Lib: auditLog, deletionUtils, vagaEventos

### Como Completar a Migração

#### Opção 1: Busca e Substituição Manual
Para cada arquivo, fazer:
1. Adicionar import: `import { logger } from '@/lib/logger';`
2. Substituir `console.log` por `logger.log`
3. Substituir `console.error` por `logger.error`
4. Substituir `console.warn` por `logger.warn`
5. Substituir `console.info` por `logger.info`
6. Substituir `console.debug` por `logger.debug`

#### Opção 2: Script de Substituição em Lote (Recomendado)
```bash
# Buscar todos os arquivos com console.log
grep -r "console\." src/ --exclude-dir=node_modules

# Para cada arquivo, usar sed ou ferramenta similar para substituir
# Exemplo (macOS/Linux):
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "console\." "$file"; then
    # Adicionar import se não existir
    if ! grep -q "from '@/lib/logger'" "$file"; then
      # Inserir import após outros imports
      sed -i '' "/^import.*from/a\\
import { logger } from '@/lib/logger';" "$file"
    fi
    
    # Substituir console.log por logger.log
    sed -i '' 's/console\.log/logger.log/g' "$file"
    sed -i '' 's/console\.error/logger.error/g' "$file"
    sed -i '' 's/console\.warn/logger.warn/g' "$file"
    sed -i '' 's/console\.info/logger.info/g' "$file"
    sed -i '' 's/console\.debug/logger.debug/g' "$file"
  fi
done
```

### Benefícios da Migração Completa

1. **Produção Limpa**: Nenhum log no console em produção
2. **Debug Fácil**: Todos os logs em desenvolvimento
3. **Integração Futura**: Pronto para Sentry/monitoring
4. **Performance**: Reduz overhead em produção
5. **Segurança**: Evita vazamento de informações sensíveis

### Próximos Passos

1. ✅ **Concluído**: Componentes críticos migrados
2. ⏳ **Pendente**: Migrar arquivos restantes (pode ser feito gradualmente)
3. ⏳ **Pendente**: Integrar Sentry para logs de produção
4. ⏳ **Pendente**: Criar dashboard de monitoring

### Estimativa de Tempo

- **Substituição manual restante**: ~2-3 horas
- **Script automatizado**: ~30 minutos
- **Testes**: ~1 hora

### Notas Importantes

- **Não quebra funcionalidade**: logger funciona identicamente ao console
- **Backward compatible**: Código existente continua funcionando
- **Graduação possível**: Pode ser feito arquivo por arquivo
- **Priority-based**: Componentes mais usados já estão migrados

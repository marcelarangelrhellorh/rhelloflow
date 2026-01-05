/**
 * Configuração centralizada de cache para React Query
 * Define tempos de cache otimizados por tipo de dado
 */

// Tempos de cache em milissegundos
export const CACHE_TIMES = {
  // Dados de perfil e autenticação - 10 minutos fresh, 30 minutos em cache
  USER_PROFILE: {
    staleTime: 10 * 60 * 1000,  // 10 minutos
    gcTime: 30 * 60 * 1000,     // 30 minutos
  },
  
  // Listas estáticas (tags, categorias) - 1 hora fresh, 24 horas em cache
  STATIC_DATA: {
    staleTime: 60 * 60 * 1000,      // 1 hora
    gcTime: 24 * 60 * 60 * 1000,    // 24 horas
  },
  
  // Dados em tempo real - 30 segundos fresh, 5 minutos em cache
  REALTIME: {
    staleTime: 30 * 1000,       // 30 segundos
    gcTime: 5 * 60 * 1000,      // 5 minutos
  },
  
  // Dados históricos - 1 dia fresh, 7 dias em cache
  HISTORICAL: {
    staleTime: 24 * 60 * 60 * 1000,     // 1 dia
    gcTime: 7 * 24 * 60 * 60 * 1000,    // 7 dias
  },
  
  // Default (configuração padrão do projeto)
  DEFAULT: {
    staleTime: 5 * 60 * 1000,   // 5 minutos
    gcTime: 30 * 60 * 1000,     // 30 minutos
  },
  
  // Aprovações pendentes - 1 minuto (dados críticos)
  PENDING: {
    staleTime: 60 * 1000,       // 1 minuto
    gcTime: 5 * 60 * 1000,      // 5 minutos
  },
  
  // Dados operacionais - 1 minuto (atualizações frequentes)
  OPERATIONAL: {
    staleTime: 60 * 1000,       // 1 minuto
    gcTime: 10 * 60 * 1000,     // 10 minutos
  },
} as const;

// Query Keys centralizados para consistência
export const queryKeys = {
  // Usuário e roles
  userRoles: (userId: string) => ['user-roles', userId] as const,
  users: (filter?: string) => ['users', { filter }] as const,
  
  // Tags
  tags: ['tags'] as const,
  
  // Aprovações pendentes
  pendingApprovals: ['pending-approvals'] as const,
  
  // Vagas
  vagas: {
    all: ['vagas'] as const,
    list: () => ['vagas', 'list'] as const,
    detail: (id: string) => ['vagas', 'detail', id] as const,
    byStatus: (status: string) => ['vagas', 'status', status] as const,
  },
  
  // Candidatos
  candidatos: {
    all: ['candidatos'] as const,
    list: () => ['candidatos', 'list'] as const,
    detail: (id: string) => ['candidatos', 'detail', id] as const,
    byVaga: (vagaId: string) => ['candidatos', 'vaga', vagaId] as const,
  },
  
  // Tarefas
  tasks: {
    all: ['tasks'] as const,
    list: () => ['tasks', 'list'] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    byVaga: (vagaId: string) => ['tasks', 'vaga', vagaId] as const,
  },
  
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    overview: () => ['dashboard', 'overview'] as const,
    userProfile: () => ['dashboard', 'userProfile'] as const,
  },
  
  // KPIs
  kpis: ['kpis'] as const,
} as const;

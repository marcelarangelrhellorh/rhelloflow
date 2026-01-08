/**
 * Vaga (Job) status constants and types
 * Centralized definition for all job status values
 */

export const VAGA_STATUS = {
  DISCOVERY: 'Discovery',
  DIVULGACAO: 'Divulgação',
  TRIAGEM: 'Triagem',
  ENTREVISTAS: 'Entrevistas',
  SHORTLIST_DISPONIVEL: 'Shortlist disponível',
  CONCLUIDA: 'Concluída',
  CONGELADA: 'Congelada',
  CANCELADA: 'Cancelada',
} as const;

export type VagaStatus = typeof VAGA_STATUS[keyof typeof VAGA_STATUS];

// Status that indicate an active job
export const ACTIVE_VAGA_STATUS: VagaStatus[] = [
  VAGA_STATUS.DISCOVERY,
  VAGA_STATUS.DIVULGACAO,
  VAGA_STATUS.TRIAGEM,
  VAGA_STATUS.ENTREVISTAS,
  VAGA_STATUS.SHORTLIST_DISPONIVEL,
];

// Status that indicate a completed or inactive job
export const CLOSED_VAGA_STATUS: VagaStatus[] = [
  VAGA_STATUS.CONCLUIDA,
  VAGA_STATUS.CONGELADA,
  VAGA_STATUS.CANCELADA,
];

// Status colors for badges and UI
export const VAGA_STATUS_COLORS: Record<VagaStatus, { bg: string; text: string }> = {
  [VAGA_STATUS.DISCOVERY]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [VAGA_STATUS.DIVULGACAO]: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  [VAGA_STATUS.TRIAGEM]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [VAGA_STATUS.ENTREVISTAS]: { bg: 'bg-orange-100', text: 'text-orange-800' },
  [VAGA_STATUS.SHORTLIST_DISPONIVEL]: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  [VAGA_STATUS.CONCLUIDA]: { bg: 'bg-green-200', text: 'text-green-900' },
  [VAGA_STATUS.CONGELADA]: { bg: 'bg-slate-100', text: 'text-slate-800' },
  [VAGA_STATUS.CANCELADA]: { bg: 'bg-red-100', text: 'text-red-800' },
};

// Stage order for pipeline/kanban views
export const VAGA_STAGE_ORDER: VagaStatus[] = [
  VAGA_STATUS.DISCOVERY,
  VAGA_STATUS.DIVULGACAO,
  VAGA_STATUS.TRIAGEM,
  VAGA_STATUS.ENTREVISTAS,
  VAGA_STATUS.SHORTLIST_DISPONIVEL,
  VAGA_STATUS.CONCLUIDA,
];

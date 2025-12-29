/**
 * Vaga (Job) status constants and types
 * Centralized definition for all job status values
 */

export const VAGA_STATUS = {
  A_INICIAR: 'A iniciar',
  DISCOVERY: 'Discovery',
  DIVULGACAO: 'Divulgação',
  TRIAGEM: 'Triagem',
  ENTREVISTAS_RHELLO: 'Entrevistas rhello',
  ENTREVISTAS_CLIENTE: 'Entrevistas Cliente',
  SHORTLIST: 'Shortlist',
  OFERTA: 'Oferta',
  FECHADA: 'Fechada',
  STAND_BY: 'Stand by',
  CANCELADA: 'Cancelada',
} as const;

export type VagaStatus = typeof VAGA_STATUS[keyof typeof VAGA_STATUS];

// Status that indicate an active job
export const ACTIVE_VAGA_STATUS: VagaStatus[] = [
  VAGA_STATUS.A_INICIAR,
  VAGA_STATUS.DISCOVERY,
  VAGA_STATUS.DIVULGACAO,
  VAGA_STATUS.TRIAGEM,
  VAGA_STATUS.ENTREVISTAS_RHELLO,
  VAGA_STATUS.ENTREVISTAS_CLIENTE,
  VAGA_STATUS.SHORTLIST,
  VAGA_STATUS.OFERTA,
];

// Status that indicate a completed or inactive job
export const CLOSED_VAGA_STATUS: VagaStatus[] = [
  VAGA_STATUS.FECHADA,
  VAGA_STATUS.STAND_BY,
  VAGA_STATUS.CANCELADA,
];

// Status colors for badges and UI
export const VAGA_STATUS_COLORS: Record<VagaStatus, { bg: string; text: string }> = {
  [VAGA_STATUS.A_INICIAR]: { bg: 'bg-slate-100', text: 'text-slate-800' },
  [VAGA_STATUS.DISCOVERY]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [VAGA_STATUS.DIVULGACAO]: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  [VAGA_STATUS.TRIAGEM]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [VAGA_STATUS.ENTREVISTAS_RHELLO]: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  [VAGA_STATUS.ENTREVISTAS_CLIENTE]: { bg: 'bg-violet-100', text: 'text-violet-800' },
  [VAGA_STATUS.SHORTLIST]: { bg: 'bg-amber-100', text: 'text-amber-800' },
  [VAGA_STATUS.OFERTA]: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  [VAGA_STATUS.FECHADA]: { bg: 'bg-green-200', text: 'text-green-900' },
  [VAGA_STATUS.STAND_BY]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [VAGA_STATUS.CANCELADA]: { bg: 'bg-red-100', text: 'text-red-800' },
};

// Stage order for pipeline/kanban views
export const VAGA_STAGE_ORDER: VagaStatus[] = [
  VAGA_STATUS.A_INICIAR,
  VAGA_STATUS.DISCOVERY,
  VAGA_STATUS.DIVULGACAO,
  VAGA_STATUS.TRIAGEM,
  VAGA_STATUS.ENTREVISTAS_RHELLO,
  VAGA_STATUS.ENTREVISTAS_CLIENTE,
  VAGA_STATUS.SHORTLIST,
  VAGA_STATUS.OFERTA,
  VAGA_STATUS.FECHADA,
];

/**
 * Candidato status constants and types
 * Centralized definition for all candidate status values
 */

export const CANDIDATO_STATUS = {
  // Initial stages
  BANCO_TALENTOS: 'Banco de Talentos',
  TRIAGEM: 'Triagem',
  
  // Interview stages
  ENTREVISTA_RHELLO: 'Entrevista rhello',
  ENTREVISTA_CLIENTE: 'Entrevista Cliente',
  ENTREVISTA_FINAL: 'Entrevista Final',
  
  // Approval stages
  APROVADO_RHELLO: 'Aprovado rhello',
  APROVADO_CLIENTE: 'Aprovado Cliente',
  
  // Rejection stages
  REPROVADO_RHELLO: 'Reprovado rhello',
  REPROVADO_CLIENTE: 'Reprovado Cliente',
  REPROVADO_TRIAGEM: 'Reprovado Triagem',
  
  // Final stages
  CONTRATADO: 'Contratado',
  DESISTIU: 'Desistiu',
  STAND_BY: 'Stand by',
} as const;

export type CandidatoStatus = typeof CANDIDATO_STATUS[keyof typeof CANDIDATO_STATUS];

// Status groups for filtering and categorization
export const STATUS_GROUPS = {
  ACTIVE: [
    CANDIDATO_STATUS.BANCO_TALENTOS,
    CANDIDATO_STATUS.TRIAGEM,
    CANDIDATO_STATUS.ENTREVISTA_RHELLO,
    CANDIDATO_STATUS.ENTREVISTA_CLIENTE,
    CANDIDATO_STATUS.ENTREVISTA_FINAL,
    CANDIDATO_STATUS.APROVADO_RHELLO,
    CANDIDATO_STATUS.APROVADO_CLIENTE,
    CANDIDATO_STATUS.STAND_BY,
  ],
  REJECTED: [
    CANDIDATO_STATUS.REPROVADO_RHELLO,
    CANDIDATO_STATUS.REPROVADO_CLIENTE,
    CANDIDATO_STATUS.REPROVADO_TRIAGEM,
  ],
  FINAL: [
    CANDIDATO_STATUS.CONTRATADO,
    CANDIDATO_STATUS.DESISTIU,
  ],
} as const;

// Status colors for badges and UI
export const STATUS_COLORS: Record<CandidatoStatus, { bg: string; text: string }> = {
  [CANDIDATO_STATUS.BANCO_TALENTOS]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [CANDIDATO_STATUS.TRIAGEM]: { bg: 'bg-gray-100', text: 'text-gray-800' },
  [CANDIDATO_STATUS.ENTREVISTA_RHELLO]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [CANDIDATO_STATUS.ENTREVISTA_CLIENTE]: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  [CANDIDATO_STATUS.ENTREVISTA_FINAL]: { bg: 'bg-violet-100', text: 'text-violet-800' },
  [CANDIDATO_STATUS.APROVADO_RHELLO]: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  [CANDIDATO_STATUS.APROVADO_CLIENTE]: { bg: 'bg-green-100', text: 'text-green-800' },
  [CANDIDATO_STATUS.REPROVADO_RHELLO]: { bg: 'bg-red-100', text: 'text-red-800' },
  [CANDIDATO_STATUS.REPROVADO_CLIENTE]: { bg: 'bg-rose-100', text: 'text-rose-800' },
  [CANDIDATO_STATUS.REPROVADO_TRIAGEM]: { bg: 'bg-orange-100', text: 'text-orange-800' },
  [CANDIDATO_STATUS.CONTRATADO]: { bg: 'bg-green-200', text: 'text-green-900' },
  [CANDIDATO_STATUS.DESISTIU]: { bg: 'bg-gray-200', text: 'text-gray-700' },
  [CANDIDATO_STATUS.STAND_BY]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

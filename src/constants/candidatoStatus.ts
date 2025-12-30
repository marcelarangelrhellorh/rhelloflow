/**
 * Candidato status constants and types
 * Centralized definition for all candidate status values
 */

export const CANDIDATO_STATUS = {
  // Não aparece no funil (gerenciado em /banco-talentos)
  BANCO_TALENTOS: 'Banco de Talentos',
  
  // Etapas do funil
  TRIAGEM: 'Triagem',
  ASSESSMENT: 'Assessment | Teste Técnico',
  ENTREVISTA: 'Entrevista',
  SHORTLIST: 'Shortlist',
  REPROVADO: 'Reprovado',
  CONTRATADO: 'Contratado',
} as const;

export type CandidatoStatus = typeof CANDIDATO_STATUS[keyof typeof CANDIDATO_STATUS];

// Ordem das colunas no funil (exclui Banco de Talentos)
export const CANDIDATO_FUNNEL_ORDER = [
  CANDIDATO_STATUS.TRIAGEM,
  CANDIDATO_STATUS.ASSESSMENT,
  CANDIDATO_STATUS.ENTREVISTA,
  CANDIDATO_STATUS.SHORTLIST,
  CANDIDATO_STATUS.REPROVADO,
  CANDIDATO_STATUS.CONTRATADO,
] as const;

// Status groups for filtering and categorization
export const STATUS_GROUPS = {
  ACTIVE: [
    CANDIDATO_STATUS.TRIAGEM,
    CANDIDATO_STATUS.ASSESSMENT,
    CANDIDATO_STATUS.ENTREVISTA,
    CANDIDATO_STATUS.SHORTLIST,
  ],
  REJECTED: [
    CANDIDATO_STATUS.REPROVADO,
  ],
  FINAL: [
    CANDIDATO_STATUS.CONTRATADO,
  ],
} as const;

// Status colors for badges and UI
export const STATUS_COLORS: Record<CandidatoStatus, { bg: string; text: string; border: string }> = {
  [CANDIDATO_STATUS.BANCO_TALENTOS]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  [CANDIDATO_STATUS.TRIAGEM]: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  [CANDIDATO_STATUS.ASSESSMENT]: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  [CANDIDATO_STATUS.ENTREVISTA]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  [CANDIDATO_STATUS.SHORTLIST]: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  [CANDIDATO_STATUS.REPROVADO]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  [CANDIDATO_STATUS.CONTRATADO]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
};

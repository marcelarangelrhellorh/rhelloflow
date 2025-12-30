// Definição centralizada das etapas do funil de vagas
// Sincronizado com a tabela vaga_status_ref

export const JOB_STAGES = [
  {
    id: "discovery",
    slug: "discovery",
    name: "Discovery",
    order: 1,
    kind: "normal" as const,
    color: {
      bg: "#2563EB",
      text: "#FFFFFF",
      columnBg: "#EFF6FF",
    },
  },
  {
    id: "divulgacao",
    slug: "divulgacao",
    name: "Divulgação",
    order: 2,
    kind: "normal" as const,
    color: {
      bg: "#0EA5E9",
      text: "#FFFFFF",
      columnBg: "#F0F9FF",
    },
  },
  {
    id: "triagem",
    slug: "triagem",
    name: "Triagem",
    order: 3,
    kind: "normal" as const,
    color: {
      bg: "#7C3AED",
      text: "#FFFFFF",
      columnBg: "#F5F3FF",
    },
  },
  {
    id: "entrevistas",
    slug: "entrevistas",
    name: "Entrevistas",
    order: 4,
    kind: "normal" as const,
    color: {
      bg: "#FB923C",
      text: "#FFFFFF",
      columnBg: "#FFF7ED",
    },
  },
  {
    id: "shortlist-disponivel",
    slug: "shortlist_disponivel",
    name: "Shortlist disponível",
    order: 5,
    kind: "normal" as const,
    color: {
      bg: "#10B981",
      text: "#FFFFFF",
      columnBg: "#ECFDF5",
    },
  },
  {
    id: "concluida",
    slug: "concluida",
    name: "Concluída",
    order: 6,
    kind: "final" as const,
    color: {
      bg: "#22C55E",
      text: "#FFFFFF",
      columnBg: "#F0FDF4",
    },
  },
  {
    id: "congelada",
    slug: "congelada",
    name: "Congelada",
    order: 7,
    kind: "frozen" as const,
    color: {
      bg: "#94A3B8",
      text: "#FFFFFF",
      columnBg: "#F8FAFC",
    },
  },
  {
    id: "cancelada",
    slug: "cancelada",
    name: "Cancelada",
    order: 8,
    kind: "canceled" as const,
    color: {
      bg: "#EF4444",
      text: "#FFFFFF",
      columnBg: "#FEF2F2",
    },
  },
];

export type JobStageKind = "normal" | "final" | "frozen" | "canceled";

export type JobStage = (typeof JOB_STAGES)[number];

// Buscar stage por nome ou slug
export const getStageByName = (stageName: string): JobStage | undefined => {
  return JOB_STAGES.find(stage => stage.name === stageName || stage.slug === stageName);
};

// Buscar stage por slug
export const getStageBySlug = (slug: string): JobStage | undefined => {
  return JOB_STAGES.find(stage => stage.slug === slug);
};

export const getStageIndex = (stageName: string): number => {
  return JOB_STAGES.findIndex(stage => stage.name === stageName || stage.slug === stageName);
};

// Calcular progresso baseado na ordem do status
export const calculateProgress = (statusOrSlug: string): number => {
  const stage = getStageByName(statusOrSlug) || getStageBySlug(statusOrSlug);
  if (!stage) return 0;
  
  // Para estados finais, retornar 100%
  if (stage.kind === 'final') return 100;
  
  // Para estados congelados/cancelados, usar ordem atual
  const totalNormalStages = JOB_STAGES.filter(s => s.kind === 'normal').length;
  return Math.round((stage.order / totalNormalStages) * 100);
};

// Mapear status legado para slug (para compatibilidade)
export const mapLegacyStatusToSlug = (oldStatus: string): string => {
  const legacyMap: Record<string, string> = {
    // Mapeamentos de etapas removidas
    'a_iniciar': 'discovery',
    'A iniciar': 'discovery',
    'entrevistas_rhello': 'entrevistas',
    'Entrevistas rhello': 'entrevistas',
    'Entrevistas Rhello': 'entrevistas',
    'aguardando_retorno_cliente': 'entrevistas',
    'Aguardando retorno do cliente': 'entrevistas',
    'entrevistas_solicitante': 'entrevistas',
    'Entrevistas solicitante': 'entrevistas',
    'Entrevista cliente': 'entrevistas',
    'apresentacao_candidatos': 'shortlist_disponivel',
    'Apresentação de candidatos': 'shortlist_disponivel',
    'Apresentação de Candidatos': 'shortlist_disponivel',
    'em_processo_contratacao': 'shortlist_disponivel',
    'Em processo de contratação': 'shortlist_disponivel',
    'Concluído': 'concluida',
  };
  
  if (legacyMap[oldStatus]) return legacyMap[oldStatus];
  
  const stage = getStageByName(oldStatus);
  return stage ? stage.slug : 'discovery';
};

// Mapear slug para label (para exibição)
export const getStatusLabel = (slugOrName: string): string => {
  const stage = getStageBySlug(slugOrName) || getStageByName(slugOrName);
  return stage ? stage.name : slugOrName;
};

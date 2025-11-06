// Definição centralizada das etapas do funil de vagas
// Agora padronizado e sincronizado com a tabela vaga_status_ref

export const JOB_STAGES = [
  {
    id: "a-iniciar",
    slug: "a_iniciar",
    name: "A iniciar",
    order: 1,
    kind: "normal" as const,
    color: {
      bg: "#16A34A",
      text: "#FFFFFF",
      columnBg: "#F0FDF4",
    },
  },
  {
    id: "discovery",
    slug: "discovery",
    name: "Discovery",
    order: 2,
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
    order: 3,
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
    order: 4,
    kind: "normal" as const,
    color: {
      bg: "#7C3AED",
      text: "#FFFFFF",
      columnBg: "#F5F3FF",
    },
  },
  {
    id: "entrevistas-rhello",
    slug: "entrevistas_rhello",
    name: "Entrevistas rhello",
    order: 5,
    kind: "normal" as const,
    color: {
      bg: "#FB923C",
      text: "#FFFFFF",
      columnBg: "#FFF7ED",
    },
  },
  {
    id: "aguardando-retorno-cliente",
    slug: "aguardando_retorno_cliente",
    name: "Aguardando retorno do cliente",
    order: 6,
    kind: "normal" as const,
    color: {
      bg: "#F59E0B",
      text: "#FFFFFF",
      columnBg: "#FFFBEB",
    },
  },
  {
    id: "apresentacao-candidatos",
    slug: "apresentacao_candidatos",
    name: "Apresentação de candidatos",
    order: 7,
    kind: "normal" as const,
    color: {
      bg: "#10B981",
      text: "#FFFFFF",
      columnBg: "#ECFDF5",
    },
  },
  {
    id: "entrevistas-solicitante",
    slug: "entrevistas_solicitante",
    name: "Entrevistas solicitante",
    order: 8,
    kind: "normal" as const,
    color: {
      bg: "#14B8A6",
      text: "#FFFFFF",
      columnBg: "#F0FDFA",
    },
  },
  {
    id: "em-processo-contratacao",
    slug: "em_processo_contratacao",
    name: "Em processo de contratação",
    order: 9,
    kind: "normal" as const,
    color: {
      bg: "#6366F1",
      text: "#FFFFFF",
      columnBg: "#EEF2FF",
    },
  },
  {
    id: "concluida",
    slug: "concluida",
    name: "Concluída",
    order: 10,
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
    order: 11,
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
    order: 12,
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
  
  // Para estados congelados/pausados/cancelados, usar ordem atual
  const totalNormalStages = JOB_STAGES.filter(s => s.kind === 'normal').length;
  return Math.round((stage.order / totalNormalStages) * 100);
};

// Mapear status legado para slug (para compatibilidade)
export const mapLegacyStatusToSlug = (oldStatus: string): string => {
  const stage = getStageByName(oldStatus);
  return stage ? stage.slug : 'a_iniciar';
};

// Mapear slug para label (para exibição)
export const getStatusLabel = (slugOrName: string): string => {
  const stage = getStageBySlug(slugOrName) || getStageByName(slugOrName);
  return stage ? stage.name : slugOrName;
};

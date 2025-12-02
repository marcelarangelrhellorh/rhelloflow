export interface ClientStage {
  id: string;
  slug: string;
  name: string;
  order: number;
  color: {
    bg: string;
    text: string;
    columnBg: string;
  };
}

export const CLIENT_STAGES: ClientStage[] = [
  {
    id: "1",
    slug: "novo_negocio",
    name: "Novo negócio",
    order: 1,
    color: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      columnBg: "bg-blue-50",
    },
  },
  {
    id: "2",
    slug: "contato_realizado",
    name: "Contato realizado",
    order: 2,
    color: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      columnBg: "bg-purple-50",
    },
  },
  {
    id: "3",
    slug: "discovery",
    name: "Discovery",
    order: 3,
    color: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      columnBg: "bg-orange-50",
    },
  },
  {
    id: "4",
    slug: "processo_andamento",
    name: "Processo em andamento",
    order: 4,
    color: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      columnBg: "bg-yellow-50",
    },
  },
  {
    id: "5",
    slug: "processo_finalizado",
    name: "Processo finalizado",
    order: 5,
    color: {
      bg: "bg-green-100",
      text: "text-green-800",
      columnBg: "bg-green-50",
    },
  },
  {
    id: "6",
    slug: "acompanhamento_30_60_90",
    name: "Acompanhamento 30/60/90",
    order: 6,
    color: {
      bg: "bg-teal-100",
      text: "text-teal-800",
      columnBg: "bg-teal-50",
    },
  },
];

export const getClientStageBySlug = (slug: string): ClientStage | undefined => {
  return CLIENT_STAGES.find((stage) => stage.slug === slug);
};

export const mapLegacyStatusToClientSlug = (oldStatus: string | null): string => {
  // Map old status values to new slugs
  const mapping: Record<string, string> = {
    ativo: "processo_andamento",
    prospect: "novo_negocio",
    inativo: "processo_finalizado",
  };
  return mapping[oldStatus || ""] || "novo_negocio";
};

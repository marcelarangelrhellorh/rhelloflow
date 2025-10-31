// Definição centralizada das etapas do funil de vagas

export const JOB_STAGES = [
  {
    id: "a-iniciar",
    name: "A iniciar",
    color: {
      bg: "#BFFCC5",
      text: "#1C7C2E",
      columnBg: "#F9FFF9",
    },
  },
  {
    id: "discovery",
    name: "Discovery",
    color: {
      bg: "#CDEAFF",
      text: "#005C99",
      columnBg: "#F8FBFF",
    },
  },
  {
    id: "triagem",
    name: "Triagem",
    color: {
      bg: "#E4D4FF",
      text: "#5A38A0",
      columnBg: "#FBF9FF",
    },
  },
  {
    id: "entrevistas-rhello",
    name: "Entrevistas Rhello",
    color: {
      bg: "#FFE3C3",
      text: "#A35900",
      columnBg: "#FFFCF7",
    },
  },
  {
    id: "apresentacao-candidatos",
    name: "Apresentação de Candidatos",
    color: {
      bg: "#FFF2B8",
      text: "#7A6000",
      columnBg: "#FFFEF5",
    },
  },
  {
    id: "entrevista-cliente",
    name: "Entrevista cliente",
    color: {
      bg: "#FFE3C3",
      text: "#A35900",
      columnBg: "#FFFCF7",
    },
  },
];

export type JobStage = (typeof JOB_STAGES)[number];

export const getStageIndex = (stageName: string): number => {
  return JOB_STAGES.findIndex(stage => stage.name === stageName);
};

export const calculateProgress = (status: string): number => {
  const stageIndex = getStageIndex(status);
  if (stageIndex === -1) return 0;
  return Math.round(((stageIndex + 1) / JOB_STAGES.length) * 100);
};

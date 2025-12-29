/**
 * Fit Cultural constants
 * Values and questions for talent pool cultural fit section
 */

export const FIT_CULTURAL_VALUES = [
  "Inovação e criatividade",
  "Colaboração e trabalho em equipe",
  "Transparência e honestidade",
  "Excelência e qualidade",
  "Aprendizado contínuo",
  "Diversidade e inclusão",
  "Impacto social positivo",
  "Autonomia e flexibilidade",
  "Orientação para resultados",
  "Agilidade e adaptabilidade",
  "Responsabilidade e ownership",
  "Feedback direto e construtivo",
] as const;

export const FIT_CULTURAL_WORK_PREFERENCES = [
  "De forma autônoma, com objetivos claros",
  "Em equipe, com colaboração constante",
  "Misto de ambos, dependendo da tarefa",
] as const;

export const FIT_CULTURAL_QUESTIONS = {
  motivacao: {
    label: "O que te motiva profissionalmente?",
    type: "textarea" as const,
    required: true,
  },
  valores: {
    label: "Quais valores são mais importantes para você?",
    type: "multiselect" as const,
    required: true,
    maxSelection: 3,
    options: FIT_CULTURAL_VALUES,
  },
  preferencia_trabalho: {
    label: "Como você prefere trabalhar?",
    type: "select" as const,
    required: true,
    options: FIT_CULTURAL_WORK_PREFERENCES,
  },
  desafios_interesse: {
    label: "Que tipos de desafios profissionais mais te interessam?",
    type: "textarea" as const,
    required: true,
  },
  ponto_forte: {
    label: "Qual considera seu principal ponto forte?",
    type: "textarea" as const,
    required: true,
  },
  area_desenvolvimento: {
    label: "Em que área de desenvolvimento ou habilidade gostaria de desenvolver mais?",
    type: "textarea" as const,
    required: true,
  },
  situacao_aprendizado: {
    label: "Conte sobre uma situação em que precisou aprender algo novo rapidamente",
    type: "textarea" as const,
    required: true,
  },
} as const;

export interface FitCulturalData {
  motivacao: string;
  valores: string[];
  preferencia_trabalho: string;
  desafios_interesse: string;
  ponto_forte: string;
  area_desenvolvimento: string;
  situacao_aprendizado: string;
}

export const MODELO_CONTRATACAO_OPTIONS = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Ambos", label: "Ambos" },
] as const;

export const FORMATO_TRABALHO_OPTIONS = [
  { value: "Presencial", label: "Presencial" },
  { value: "Remoto", label: "Remoto" },
  { value: "Híbrido", label: "Híbrido" },
] as const;

export const ORIGEM_OPTIONS = [
  { value: "LinkedIn", label: "💼 LinkedIn" },
  { value: "Indicação", label: "👥 Indicação" },
  { value: "Site", label: "🌐 Site" },
  { value: "Evento", label: "🎪 Evento" },
  { value: "Google", label: "🔍 Google" },
  { value: "Instagram", label: "📸 Instagram" },
  { value: "WhatsApp", label: "💬 WhatsApp" },
  { value: "Outros", label: "➕ Outros" },
] as const;

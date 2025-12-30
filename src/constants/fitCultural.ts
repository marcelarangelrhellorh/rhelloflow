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
  { value: "Link de Divulgação", label: "🔗 Link de Divulgação" },
  { value: "Pandapé", label: "🐼 Pandapé" },
  { value: "LinkedIn", label: "💼 LinkedIn" },
  { value: "Gupy", label: "🎯 Gupy" },
  { value: "Indeed", label: "📋 Indeed" },
  { value: "Catho", label: "📊 Catho" },
  { value: "Indicação", label: "👥 Indicação" },
  { value: "Site da Empresa", label: "🌐 Site da Empresa" },
  { value: "Instagram", label: "📸 Instagram" },
  { value: "WhatsApp", label: "💬 WhatsApp" },
  { value: "Google", label: "🔍 Google" },
  { value: "E-mail Direto", label: "✉️ E-mail Direto" },
  { value: "Hunting", label: "🎯 Hunting" },
  { value: "Evento", label: "🎪 Evento" },
  { value: "Outra", label: "➕ Outra" },
] as const;

// Opções de cargo
export const CARGO_OPTIONS = [
  { value: "Analista", label: "Analista" },
  { value: "Assistente", label: "Assistente" },
  { value: "Auxiliar", label: "Auxiliar" },
  { value: "Consultor", label: "Consultor" },
  { value: "Coordenador", label: "Coordenador" },
  { value: "Designer", label: "Designer" },
  { value: "Desenvolvedor", label: "Desenvolvedor" },
  { value: "Diretor", label: "Diretor" },
  { value: "Especialista", label: "Especialista" },
  { value: "Estagiário", label: "Estagiário" },
  { value: "Gerente", label: "Gerente" },
  { value: "Líder", label: "Líder" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Trainee", label: "Trainee" },
  { value: "Outros", label: "Outros" },
] as const;

// Estados brasileiros
export const ESTADOS_BRASILEIROS = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

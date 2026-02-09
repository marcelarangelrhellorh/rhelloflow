/**
 * Candidato (Candidate) types
 * Shared type definitions for candidate-related data
 */

import type { CandidatoStatus } from '@/constants/candidatoStatus';
import type { FitCulturalData } from '@/constants/fitCultural';

export interface Candidato {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculo_link: string | null;
  curriculo_url: string | null;
  portfolio_url: string | null;
  nivel: string | null;
  cargo: string | null;
  area: string | null;
  status: CandidatoStatus | string;
  vaga_relacionada_id: string | null;
  pretensao_salarial: number | null;
  disponibilidade_mudanca: string | null;
  disponibilidade_status: string | null;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
  parecer_final: string | null;
  feedback: string | null;
  criado_em: string;
  origem: string | null;
  source_link_id: string | null;
  experiencia_profissional: string | null;
  idiomas: string | null;
  idade: number | null;
  sexo: string | null;
  historico_experiencia: string | null;
  recrutador: string | null;
  total_feedbacks: number;
  ultimo_feedback: string | null;
  hired_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  deletion_type: string | null;
  is_visible_for_client: boolean | null;
  idempotency_key: string | null;
  utm: Record<string, unknown> | null;
  modelo_contratacao: string | null;
  formato_trabalho: string | null;
  fit_cultural: FitCulturalData | null;
  talent_pool_link_id: string | null;
  disc_url: string | null;
  gravacao_entrevista_url: string | null;
}

export interface CandidatoHistorico {
  id: string;
  candidato_id: string;
  vaga_id: string | null;
  resultado: 'Aprovado' | 'Reprovado' | 'Contratado' | 'Em andamento';
  feedback: string | null;
  data: string | null;
  recrutador: string | null;
}

export interface CandidatoStats {
  ultimoFeedback: string | null;
  totalProcessos: number;
  mediaRating: number | null;
  qtdAvaliacoes: number;
  totalFeedbacks: number;
}

export interface CandidatoFeedback {
  id: string;
  candidato_id: string;
  vaga_id: string | null;
  author_user_id: string;
  tipo: string;
  conteudo: string;
  avaliacao: number | null;
  etapa: string | null;
  disposicao: string | null;
  origem: string | null;
  quick_tags: string[] | null;
  criado_em: string;
  atualizado_em: string;
  sender_name: string | null;
  sender_email: string | null;
}

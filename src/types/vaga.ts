/**
 * Vaga (Job) types
 * Shared type definitions for job-related data
 */

import type { VagaStatus } from '@/constants/vagaStatus';

export interface Vaga {
  id: string;
  titulo: string;
  cliente: string | null;
  cliente_id: string | null;
  descricao: string | null;
  requisitos: string | null;
  salario_minimo: number | null;
  salario_maximo: number | null;
  local: string | null;
  modalidade: string | null;
  status: VagaStatus | string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente' | null;
  recrutador_responsavel: string | null;
  recrutador_name: string | null;
  data_abertura: string | null;
  data_fechamento: string | null;
  prazo_entrega: string | null;
  nivel_experiencia: string | null;
  quantidade_vagas: number | null;
  beneficios: string | null;
  area: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  deletion_type: string | null;
  last_status_change_by: string | null;
  last_status_change_at: string | null;
}

export interface VagaWithStats extends Vaga {
  total_candidatos?: number;
  candidatos_ativos?: number;
  candidatos_aprovados?: number;
  candidatos_reprovados?: number;
  candidatos_contratados?: number;
}

export interface VagaEvento {
  id: string;
  vaga_id: string;
  tipo: string;
  descricao: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  criado_em: string;
  metadata: Record<string, unknown> | null;
}

export interface VagaStageHistory {
  id: string;
  job_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string | null;
  correlation_id: string | null;
}

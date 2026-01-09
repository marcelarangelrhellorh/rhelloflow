/**
 * Database Types - Strict types derived from Supabase schema
 * Use these instead of 'as any' for type-safe database operations
 */

import type { Database } from '@/integrations/supabase/types';

// ============= Table Row Types (for reading) =============
export type VagaRow = Database['public']['Tables']['vagas']['Row'];
export type CandidatoRow = Database['public']['Tables']['candidatos']['Row'];
export type EmpresaRow = Database['public']['Tables']['empresas']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type FeedbackRow = Database['public']['Tables']['feedbacks']['Row'];
export type TagRow = Database['public']['Tables']['tags']['Row'];
export type UserRow = Database['public']['Tables']['users']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

// ============= Table Insert Types =============
export type VagaInsert = Database['public']['Tables']['vagas']['Insert'];
export type CandidatoInsert = Database['public']['Tables']['candidatos']['Insert'];
export type EmpresaInsert = Database['public']['Tables']['empresas']['Insert'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type FeedbackInsert = Database['public']['Tables']['feedbacks']['Insert'];

// ============= Table Update Types =============
export type VagaUpdate = Database['public']['Tables']['vagas']['Update'];
export type CandidatoUpdate = Database['public']['Tables']['candidatos']['Update'];
export type EmpresaUpdate = Database['public']['Tables']['empresas']['Update'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type FeedbackUpdate = Database['public']['Tables']['feedbacks']['Update'];

// ============= Enum Types =============
export type StatusVaga = Database['public']['Enums']['status_vaga'];
export type StatusCandidato = Database['public']['Enums']['status_candidato'];
export type NivelCandidato = Database['public']['Enums']['nivel_candidato'];
export type AreaCandidato = Database['public']['Enums']['area_candidato'];
export type ModeloTrabalho = Database['public']['Enums']['modelo_trabalho'];
export type PrioridadeVaga = Database['public']['Enums']['prioridade_vaga'];
export type ComplexidadeVaga = Database['public']['Enums']['complexidade_vaga'];
export type AppRole = Database['public']['Enums']['app_role'];
export type ResultadoHistorico = Database['public']['Enums']['resultado_historico'];
export type OrigemCandidatura = Database['public']['Enums']['origem_candidatura'];

// ============= View Types =============
export type VagaComStats = Database['public']['Views']['vw_vagas_com_stats']['Row'];
export type CandidatoActive = Database['public']['Views']['candidatos_active']['Row'];
export type CandidatoPublicView = Database['public']['Views']['candidatos_public_view']['Row'];

// ============= Task-specific Types =============
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'meeting' | 'task' | 'follow_up' | 'call' | 'email' | 'outros';
export type MeetingOutcome = 'realizada' | 'reagendada' | 'cancelada' | 'no_show';

// ============= Error Types =============
export interface ApiError {
  message?: string;
  error_description?: string;
  msg?: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ============= Import Types =============
export interface ParsedCandidate {
  lineNumber: number;
  data: Record<string, unknown>;
  normalized: Partial<CandidatoInsert>;
  isDuplicate: boolean;
  validationError?: string;
}

export interface ImportResults {
  success: number;
  failed: number;
  duplicates: number;
  errors?: Array<{ line: number; error: string }>;
}

// ============= Helper function to safely cast enums =============
export function isStatusVaga(value: string): value is StatusVaga {
  const validStatuses: StatusVaga[] = [
    'A iniciar', 'Discovery', 'Triagem', 'Entrevistas Rhello',
    'Aguardando retorno do cliente', 'Apresentação de Candidatos',
    'Entrevista cliente', 'Em processo de contratação', 'Concluído',
    'Cancelada', 'Divulgação', 'Entrevistas', 'Shortlist disponível',
    'Concluída', 'Congelada'
  ];
  return validStatuses.includes(value as StatusVaga);
}

export function isStatusCandidato(value: string): value is StatusCandidato {
  const validStatuses: StatusCandidato[] = [
    'Banco de Talentos', 'Selecionado', 'Shortlist', 'Entrevista rhello',
    'Reprovado rhello', 'Aprovado rhello', 'Entrevistas Solicitante',
    'Reprovado Solicitante', 'Aprovado Solicitante', 'Contratado',
    'Reprovado Rhello', 'Aprovado Rhello', 'Assessment | Teste Técnico',
    'Entrevista', 'Reprovado', 'Triagem'
  ];
  return validStatuses.includes(value as StatusCandidato);
}

export function isNivelCandidato(value: string): value is NivelCandidato {
  const validNiveis: NivelCandidato[] = [
    'Estagiário', 'Júnior', 'Pleno', 'Sênior', 'Liderança'
  ];
  return validNiveis.includes(value as NivelCandidato);
}

export function isAreaCandidato(value: string): value is AreaCandidato {
  const validAreas: AreaCandidato[] = [
    'RH', 'Vendas', 'Financeiro', 'Marketing', 'Operações',
    'TI', 'Administrativo', 'Comercial', 'Logística', 'Outros'
  ];
  return validAreas.includes(value as AreaCandidato);
}

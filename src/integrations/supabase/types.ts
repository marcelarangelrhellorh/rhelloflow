export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor: Json
          client: Json | null
          correlation_id: string
          event_hash: string
          id: string
          payload: Json | null
          prev_hash: string | null
          resource: Json
          signature_metadata: Json | null
          timestamp_utc: string
        }
        Insert: {
          action: string
          actor: Json
          client?: Json | null
          correlation_id?: string
          event_hash: string
          id?: string
          payload?: Json | null
          prev_hash?: string | null
          resource: Json
          signature_metadata?: Json | null
          timestamp_utc?: string
        }
        Update: {
          action?: string
          actor?: Json
          client?: Json | null
          correlation_id?: string
          event_hash?: string
          id?: string
          payload?: Json | null
          prev_hash?: string | null
          resource?: Json
          signature_metadata?: Json | null
          timestamp_utc?: string
        }
        Relationships: []
      }
      beneficios_mercado: {
        Row: {
          diferenciais: string[] | null
          estudo_id: string
          id: string
          recorrentes: string[] | null
        }
        Insert: {
          diferenciais?: string[] | null
          estudo_id: string
          id?: string
          recorrentes?: string[] | null
        }
        Update: {
          diferenciais?: string[] | null
          estudo_id?: string
          id?: string
          recorrentes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_mercado_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_scorecards: {
        Row: {
          candidate_id: string
          comments: string | null
          created_at: string | null
          evaluator_id: string
          id: string
          match_percentage: number | null
          recommendation:
            | Database["public"]["Enums"]["scorecard_recommendation"]
            | null
          template_id: string
          total_score: number | null
          updated_at: string | null
          vaga_id: string | null
        }
        Insert: {
          candidate_id: string
          comments?: string | null
          created_at?: string | null
          evaluator_id: string
          id?: string
          match_percentage?: number | null
          recommendation?:
            | Database["public"]["Enums"]["scorecard_recommendation"]
            | null
          template_id: string
          total_score?: number | null
          updated_at?: string | null
          vaga_id?: string | null
        }
        Update: {
          candidate_id?: string
          comments?: string | null
          created_at?: string | null
          evaluator_id?: string
          id?: string
          match_percentage?: number | null
          recommendation?:
            | Database["public"]["Enums"]["scorecard_recommendation"]
            | null
          template_id?: string
          total_score?: number | null
          updated_at?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "scorecard_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scorecards_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_tags: {
        Row: {
          added_at: string | null
          added_by: string | null
          added_reason: string | null
          candidate_id: string
          id: string
          tag_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          added_reason?: string | null
          candidate_id: string
          id?: string
          tag_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          added_reason?: string | null
          candidate_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["tag_id"]
          },
        ]
      }
      candidatos: {
        Row: {
          area: Database["public"]["Enums"]["area_candidato"] | null
          cidade: string | null
          criado_em: string | null
          curriculo_link: string | null
          curriculo_url: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          disponibilidade_mudanca: string | null
          disponibilidade_status: string | null
          email: string
          estado: string | null
          experiencia_profissional: string | null
          feedback: string | null
          historico_experiencia: string | null
          id: string
          idade: number | null
          idiomas: string | null
          linkedin: string | null
          nivel: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string
          origem: string | null
          parecer_final: string | null
          pontos_desenvolver: string | null
          pontos_fortes: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          recrutador: string | null
          sexo: string | null
          source_link_id: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          telefone: string | null
          total_feedbacks: number
          ultimo_feedback: string | null
          utm: Json | null
          vaga_relacionada_id: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          curriculo_link?: string | null
          curriculo_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disponibilidade_mudanca?: string | null
          disponibilidade_status?: string | null
          email: string
          estado?: string | null
          experiencia_profissional?: string | null
          feedback?: string | null
          historico_experiencia?: string | null
          id?: string
          idade?: number | null
          idiomas?: string | null
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string
          origem?: string | null
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          sexo?: string | null
          source_link_id?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number
          ultimo_feedback?: string | null
          utm?: Json | null
          vaga_relacionada_id?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          curriculo_link?: string | null
          curriculo_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disponibilidade_mudanca?: string | null
          disponibilidade_status?: string | null
          email?: string
          estado?: string | null
          experiencia_profissional?: string | null
          feedback?: string | null
          historico_experiencia?: string | null
          id?: string
          idade?: number | null
          idiomas?: string | null
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string
          origem?: string | null
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          sexo?: string | null
          source_link_id?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number
          ultimo_feedback?: string | null
          utm?: Json | null
          vaga_relacionada_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_source_link_id_fkey"
            columns: ["source_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_view_links: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          token: string
          vaga_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          token: string
          vaga_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          token?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_view_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_view_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_view_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_view_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          correlation_id: string
          deletion_reason: string
          id: string
          metadata: Json | null
          mfa_verified: boolean
          rejection_reason: string | null
          requested_at: string
          requested_by: string
          requires_mfa: boolean
          resource_id: string
          resource_type: string
          risk_level: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          correlation_id?: string
          deletion_reason: string
          id?: string
          metadata?: Json | null
          mfa_verified?: boolean
          rejection_reason?: string | null
          requested_at?: string
          requested_by: string
          requires_mfa?: boolean
          resource_id: string
          resource_type: string
          risk_level: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          correlation_id?: string
          deletion_reason?: string
          id?: string
          metadata?: Json | null
          mfa_verified?: boolean
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string
          requires_mfa?: boolean
          resource_id?: string
          resource_type?: string
          risk_level?: string
          status?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      estudos: {
        Row: {
          beneficios_cliente: string[] | null
          cidade: string | null
          cliente: string | null
          created_at: string
          funcao: string
          id: string
          modelo_trabalho: string | null
          observacoes: string | null
          periodo: string | null
          porte: string | null
          resultado: Json | null
          salario_cliente: number | null
          senioridade: string | null
          setor: string | null
          uf: string | null
        }
        Insert: {
          beneficios_cliente?: string[] | null
          cidade?: string | null
          cliente?: string | null
          created_at?: string
          funcao: string
          id?: string
          modelo_trabalho?: string | null
          observacoes?: string | null
          periodo?: string | null
          porte?: string | null
          resultado?: Json | null
          salario_cliente?: number | null
          senioridade?: string | null
          setor?: string | null
          uf?: string | null
        }
        Update: {
          beneficios_cliente?: string[] | null
          cidade?: string | null
          cliente?: string | null
          created_at?: string
          funcao?: string
          id?: string
          modelo_trabalho?: string | null
          observacoes?: string | null
          periodo?: string | null
          porte?: string | null
          resultado?: Json | null
          salario_cliente?: number | null
          senioridade?: string | null
          setor?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      faixas_salariais: {
        Row: {
          estudo_id: string
          fontes: string[] | null
          id: string
          nivel: string
          salario_max: number | null
          salario_med: number | null
          salario_min: number | null
        }
        Insert: {
          estudo_id: string
          fontes?: string[] | null
          id?: string
          nivel: string
          salario_max?: number | null
          salario_med?: number | null
          salario_min?: number | null
        }
        Update: {
          estudo_id?: string
          fontes?: string[] | null
          id?: string
          nivel?: string
          salario_max?: number | null
          salario_med?: number | null
          salario_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faixas_salariais_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          allow_multiple: boolean | null
          candidato_id: string
          created_at: string | null
          expires_at: string
          id: string
          recrutador_id: string
          token: string
          vaga_id: string
        }
        Insert: {
          allow_multiple?: boolean | null
          candidato_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          recrutador_id: string
          token: string
          vaga_id: string
        }
        Update: {
          allow_multiple?: boolean | null
          candidato_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          recrutador_id?: string
          token?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "feedback_requests_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          atualizado_em: string
          author_user_id: string
          avaliacao: number | null
          candidato_id: string
          conteudo: string
          criado_em: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          disposicao: string | null
          etapa: string | null
          id: string
          ip_address: string | null
          origem: string | null
          quick_tags: string[] | null
          request_id: string | null
          sender_email: string | null
          sender_name: string | null
          tipo: string
          user_agent: string | null
          vaga_id: string | null
        }
        Insert: {
          atualizado_em?: string
          author_user_id: string
          avaliacao?: number | null
          candidato_id: string
          conteudo: string
          criado_em?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disposicao?: string | null
          etapa?: string | null
          id?: string
          ip_address?: string | null
          origem?: string | null
          quick_tags?: string[] | null
          request_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tipo: string
          user_agent?: string | null
          vaga_id?: string | null
        }
        Update: {
          atualizado_em?: string
          author_user_id?: string
          avaliacao?: number | null
          candidato_id?: string
          conteudo?: string
          criado_em?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disposicao?: string | null
          etapa?: string | null
          id?: string
          ip_address?: string | null
          origem?: string | null
          quick_tags?: string[] | null
          request_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tipo?: string
          user_agent?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_consultadas: {
        Row: {
          estudo_id: string
          id: string
          nome: string
          periodo: string | null
          tipo: string | null
          url: string | null
        }
        Insert: {
          estudo_id: string
          id?: string
          nome: string
          periodo?: string | null
          tipo?: string | null
          url?: string | null
        }
        Update: {
          estudo_id?: string
          id?: string
          nome?: string
          periodo?: string | null
          tipo?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fontes_consultadas_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_candidatos: {
        Row: {
          candidato_id: string
          data: string | null
          feedback: string | null
          id: string
          recrutador: string | null
          resultado: Database["public"]["Enums"]["resultado_historico"]
          vaga_id: string | null
        }
        Insert: {
          candidato_id: string
          data?: string | null
          feedback?: string | null
          id?: string
          recrutador?: string | null
          resultado: Database["public"]["Enums"]["resultado_historico"]
          vaga_id?: string | null
        }
        Update: {
          candidato_id?: string
          data?: string | null
          feedback?: string | null
          id?: string
          recrutador?: string | null
          resultado?: Database["public"]["Enums"]["resultado_historico"]
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "historico_candidatos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          created_by: string
          dedup_field: string
          duplicates_found: Json | null
          error_count: number
          file_name: string
          id: string
          ignored_count: number
          import_mode: string
          processing_time_ms: number | null
          results: Json | null
          source_type: string
          success_count: number
          total_rows: number
          updated_count: number
          vaga_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dedup_field?: string
          duplicates_found?: Json | null
          error_count?: number
          file_name: string
          id?: string
          ignored_count?: number
          import_mode?: string
          processing_time_ms?: number | null
          results?: Json | null
          source_type: string
          success_count?: number
          total_rows?: number
          updated_count?: number
          vaga_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dedup_field?: string
          duplicates_found?: Json | null
          error_count?: number
          file_name?: string
          id?: string
          ignored_count?: number
          import_mode?: string
          processing_time_ms?: number | null
          results?: Json | null
          source_type?: string
          success_count?: number
          total_rows?: number
          updated_count?: number
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          job_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          job_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          job_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          vaga_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          vaga_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          job_id: string | null
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_imports: {
        Row: {
          accepted_at: string | null
          candidato_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          expires_at: string
          extracted_data: Json
          file_hash: string
          file_name: string
          global_confidence: number | null
          id: string
          source_type: string
          status: string
          storage_path: string | null
          vaga_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          candidato_id?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          expires_at?: string
          extracted_data: Json
          file_hash: string
          file_name: string
          global_confidence?: number | null
          id?: string
          source_type: string
          status?: string
          storage_path?: string | null
          vaga_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          candidato_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          expires_at?: string
          extracted_data?: Json
          file_hash?: string
          file_name?: string
          global_confidence?: number | null
          id?: string
          source_type?: string
          status?: string
          storage_path?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "fk_candidato_id"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vaga_id"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vaga_id"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vaga_id"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vaga_id"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_delete_snapshots: {
        Row: {
          correlation_id: string
          deleted_at: string
          deleted_by: string
          deletion_type: string
          encrypted: boolean
          encryption_key_id: string | null
          id: string
          resource_id: string
          resource_type: string
          snapshot_data: Json
        }
        Insert: {
          correlation_id: string
          deleted_at?: string
          deleted_by: string
          deletion_type: string
          encrypted?: boolean
          encryption_key_id?: string | null
          id?: string
          resource_id: string
          resource_type: string
          snapshot_data: Json
        }
        Update: {
          correlation_id?: string
          deleted_at?: string
          deleted_by?: string
          deletion_type?: string
          encrypted?: boolean
          encryption_key_id?: string | null
          id?: string
          resource_id?: string
          resource_type?: string
          snapshot_data?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          empresa: string | null
          empresa_id: string | null
          full_name: string
          google_access_token: string | null
          google_calendar_connected: boolean | null
          google_calendar_last_sync: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          role: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          created_at?: string | null
          empresa?: string | null
          empresa_id?: string | null
          full_name: string
          google_access_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_last_sync?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          role?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          created_at?: string | null
          empresa?: string | null
          empresa_id?: string | null
          full_name?: string
          google_access_token?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_last_sync?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          role?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      public_job_submissions_log: {
        Row: {
          blocked: boolean | null
          company_name: string | null
          content_hash: string
          id: string
          ip_address: string
          job_title: string | null
          submitted_at: string
        }
        Insert: {
          blocked?: boolean | null
          company_name?: string | null
          content_hash: string
          id?: string
          ip_address: string
          job_title?: string | null
          submitted_at?: string
        }
        Update: {
          blocked?: boolean | null
          company_name?: string | null
          content_hash?: string
          id?: string
          ip_address?: string
          job_title?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      scorecard_analysis_logs: {
        Row: {
          ai_model: string
          analyzed_by: string
          anonymized: boolean
          candidates_count: number
          created_at: string
          id: string
          included_comments: boolean
          vaga_id: string
        }
        Insert: {
          ai_model: string
          analyzed_by: string
          anonymized?: boolean
          candidates_count: number
          created_at?: string
          id?: string
          included_comments?: boolean
          vaga_id: string
        }
        Update: {
          ai_model?: string
          analyzed_by?: string
          anonymized?: boolean
          candidates_count?: number
          created_at?: string
          id?: string
          included_comments?: boolean
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_analysis_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_analysis_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_analysis_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_analysis_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_criteria: {
        Row: {
          category: Database["public"]["Enums"]["criteria_category"]
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          scale_type: Database["public"]["Enums"]["scale_type"] | null
          template_id: string
          weight: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["criteria_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          scale_type?: Database["public"]["Enums"]["scale_type"] | null
          template_id: string
          weight?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["criteria_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          scale_type?: Database["public"]["Enums"]["scale_type"] | null
          template_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_criteria_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_evaluations: {
        Row: {
          created_at: string | null
          criteria_id: string
          id: string
          notes: string | null
          score: number | null
          scorecard_id: string
        }
        Insert: {
          created_at?: string | null
          criteria_id: string
          id?: string
          notes?: string | null
          score?: number | null
          scorecard_id: string
        }
        Update: {
          created_at?: string | null
          criteria_id?: string
          id?: string
          notes?: string | null
          score?: number | null
          scorecard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_evaluations_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "scorecard_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_evaluations_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "candidate_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      share_link_audit: {
        Row: {
          action: string
          changes: Json | null
          id: string
          ip_address: string | null
          performed_at: string | null
          performed_by: string | null
          share_link_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          share_link_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          share_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_link_audit_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_link_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          share_link_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          share_link_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          share_link_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_link_events_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          max_submissions: number | null
          note: string | null
          password_hash: string | null
          revoked: boolean | null
          revoked_at: string | null
          revoked_by: string | null
          share_config: Json | null
          submissions_count: number
          token: string
          updated_at: string
          vaga_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_submissions?: number | null
          note?: string | null
          password_hash?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          share_config?: Json | null
          submissions_count?: number
          token: string
          updated_at?: string
          vaga_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_submissions?: number | null
          note?: string | null
          password_hash?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          share_config?: Json | null
          submissions_count?: number
          token?: string
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          error_message: string | null
          google_event_id: string | null
          id: string
          status: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          status?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          status?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          label: string
          slug: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label: string
          slug?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string
          slug?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          attendee_emails: string[] | null
          calendar_id: string | null
          candidato_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          empresa_id: string | null
          end_time: string | null
          google_calendar_event_id: string | null
          google_calendar_last_sync: string | null
          google_calendar_synced: boolean | null
          google_meet_link: string | null
          google_task_id: string | null
          google_task_last_sync: string | null
          google_task_list_id: string | null
          google_task_synced: boolean | null
          id: string
          priority: string | null
          reminder_minutes: number | null
          start_time: string | null
          status: string | null
          sync_enabled: boolean | null
          task_type: string | null
          title: string
          updated_at: string | null
          vaga_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          attendee_emails?: string[] | null
          calendar_id?: string | null
          candidato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          empresa_id?: string | null
          end_time?: string | null
          google_calendar_event_id?: string | null
          google_calendar_last_sync?: string | null
          google_calendar_synced?: boolean | null
          google_meet_link?: string | null
          google_task_id?: string | null
          google_task_last_sync?: string | null
          google_task_list_id?: string | null
          google_task_synced?: boolean | null
          id?: string
          priority?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          status?: string | null
          sync_enabled?: boolean | null
          task_type?: string | null
          title: string
          updated_at?: string | null
          vaga_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          attendee_emails?: string[] | null
          calendar_id?: string | null
          candidato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          empresa_id?: string | null
          end_time?: string | null
          google_calendar_event_id?: string | null
          google_calendar_last_sync?: string | null
          google_calendar_synced?: boolean | null
          google_meet_link?: string | null
          google_task_id?: string | null
          google_task_last_sync?: string | null
          google_task_list_id?: string | null
          google_task_synced?: boolean | null
          id?: string
          priority?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          status?: string | null
          sync_enabled?: boolean | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "tasks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      vacancy_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          tag_id: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_id: string
          vacancy_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_id?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "vacancy_tags_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_tags_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_tags_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_tags_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      vaga_eventos: {
        Row: {
          actor_user_id: string | null
          created_at: string
          descricao: string
          id: string
          payload: Json | null
          tipo: string
          vaga_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          payload?: Json | null
          tipo: string
          vaga_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          payload?: Json | null
          tipo?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaga_eventos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_eventos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_eventos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaga_eventos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      vaga_status_ref: {
        Row: {
          color: string
          kind: string
          label: string
          order: number
          slug: string
        }
        Insert: {
          color: string
          kind: string
          label: string
          order: number
          slug: string
        }
        Update: {
          color?: string
          kind?: string
          label?: string
          order?: number
          slug?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          beneficios: string[] | null
          beneficios_outros: string | null
          cliente_id: string | null
          complexidade: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial: boolean | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_by: string | null
          criado_em: string | null
          cs_id: string | null
          cs_responsavel: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          dias_semana: string[] | null
          empresa: string
          empresa_id: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          motivo_confidencial: string | null
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id: string | null
          recrutador: string | null
          recrutador_id: string | null
          requisitos_desejaveis: string | null
          requisitos_obrigatorios: string | null
          responsabilidades: string | null
          salario_max: number | null
          salario_min: number | null
          salario_modalidade: string | null
          solicitante_email: string | null
          solicitante_nome: string | null
          solicitante_telefone: string | null
          source: string | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at: string | null
          status_order: number | null
          status_slug: string | null
          tipo_contratacao: string | null
          titulo: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          cliente_id?: string | null
          complexidade?: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial?: boolean | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_by?: string | null
          criado_em?: string | null
          cs_id?: string | null
          cs_responsavel?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          dias_semana?: string[] | null
          empresa: string
          empresa_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_confidencial?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id?: string | null
          recrutador?: string | null
          recrutador_id?: string | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: number | null
          salario_min?: number | null
          salario_modalidade?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          cliente_id?: string | null
          complexidade?: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial?: boolean | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_by?: string | null
          criado_em?: string | null
          cs_id?: string | null
          cs_responsavel?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          dias_semana?: string[] | null
          empresa?: string
          empresa_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_confidencial?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id?: string | null
          recrutador?: string | null
          recrutador_id?: string | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: number | null
          salario_min?: number | null
          salario_modalidade?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vagas_status_slug"
            columns: ["status_slug"]
            isOneToOne: false
            referencedRelation: "vaga_status_ref"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "vagas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_recrutador_id_fkey"
            columns: ["recrutador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sends: {
        Row: {
          candidate_id: string
          consent_confirmed: boolean
          created_at: string
          error_message: string | null
          id: string
          number: string
          provider_response: Json | null
          sent_at: string | null
          sent_by: string
          status: string
          template_key: string | null
          text: string
          vacancy_id: string | null
        }
        Insert: {
          candidate_id: string
          consent_confirmed?: boolean
          created_at?: string
          error_message?: string | null
          id?: string
          number: string
          provider_response?: Json | null
          sent_at?: string | null
          sent_by: string
          status?: string
          template_key?: string | null
          text: string
          vacancy_id?: string | null
        }
        Update: {
          candidate_id?: string
          consent_confirmed?: boolean
          created_at?: string
          error_message?: string | null
          id?: string
          number?: string
          provider_response?: Json | null
          sent_at?: string | null
          sent_by?: string
          status?: string
          template_key?: string | null
          text?: string
          vacancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "whatsapp_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      audit_events_recent: {
        Row: {
          action: string | null
          actor: Json | null
          client: Json | null
          correlation_id: string | null
          event_hash: string | null
          id: string | null
          payload: Json | null
          prev_hash: string | null
          resource: Json | null
          signature_metadata: Json | null
          timestamp_utc: string | null
        }
        Insert: {
          action?: string | null
          actor?: Json | null
          client?: Json | null
          correlation_id?: string | null
          event_hash?: string | null
          id?: string | null
          payload?: Json | null
          prev_hash?: string | null
          resource?: Json | null
          signature_metadata?: Json | null
          timestamp_utc?: string | null
        }
        Update: {
          action?: string | null
          actor?: Json | null
          client?: Json | null
          correlation_id?: string | null
          event_hash?: string | null
          id?: string | null
          payload?: Json | null
          prev_hash?: string | null
          resource?: Json | null
          signature_metadata?: Json | null
          timestamp_utc?: string | null
        }
        Relationships: []
      }
      candidates_with_tags: {
        Row: {
          area: Database["public"]["Enums"]["area_candidato"] | null
          cidade: string | null
          criado_em: string | null
          curriculo_link: string | null
          curriculo_url: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          disponibilidade_mudanca: string | null
          disponibilidade_status: string | null
          email: string | null
          estado: string | null
          feedback: string | null
          id: string | null
          linkedin: string | null
          nivel: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string | null
          origem: string | null
          parecer_final: string | null
          pontos_desenvolver: string | null
          pontos_fortes: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          recrutador: string | null
          source_link_id: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          tags: Json | null
          telefone: string | null
          total_feedbacks: number | null
          ultimo_feedback: string | null
          utm: Json | null
          vaga_relacionada_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_source_link_id_fkey"
            columns: ["source_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos_active: {
        Row: {
          area: Database["public"]["Enums"]["area_candidato"] | null
          cidade: string | null
          criado_em: string | null
          curriculo_link: string | null
          curriculo_url: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          disponibilidade_mudanca: string | null
          disponibilidade_status: string | null
          email: string | null
          estado: string | null
          feedback: string | null
          id: string | null
          linkedin: string | null
          nivel: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string | null
          origem: string | null
          parecer_final: string | null
          pontos_desenvolver: string | null
          pontos_fortes: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          recrutador: string | null
          source_link_id: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          telefone: string | null
          total_feedbacks: number | null
          ultimo_feedback: string | null
          utm: Json | null
          vaga_relacionada_id: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          curriculo_link?: string | null
          curriculo_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disponibilidade_mudanca?: string | null
          disponibilidade_status?: string | null
          email?: string | null
          estado?: string | null
          feedback?: string | null
          id?: string | null
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string | null
          origem?: string | null
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          source_link_id?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number | null
          ultimo_feedback?: string | null
          utm?: Json | null
          vaga_relacionada_id?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          curriculo_link?: string | null
          curriculo_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disponibilidade_mudanca?: string | null
          disponibilidade_status?: string | null
          email?: string | null
          estado?: string | null
          feedback?: string | null
          id?: string | null
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string | null
          origem?: string | null
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          source_link_id?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number | null
          ultimo_feedback?: string | null
          utm?: Json | null
          vaga_relacionada_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_source_link_id_fkey"
            columns: ["source_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos_public_view: {
        Row: {
          area: Database["public"]["Enums"]["area_candidato"] | null
          cidade: string | null
          criado_em: string | null
          estado: string | null
          id: string | null
          nivel: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          vaga_relacionada_id: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          vaga_relacionada_id?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_candidato"] | null
          cidade?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          vaga_relacionada_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_last30: {
        Row: {
          feedbacks_pendentes: number | null
          taxa_aprovacao_percent: number | null
          tempo_medio_corridos: number | null
          tempo_medio_uteis: number | null
          total_aprovados: number | null
          total_finalizados: number | null
          vagas_reabertas: number | null
        }
        Relationships: []
      }
      dashboard_overview: {
        Row: {
          candidatos_ativos: number | null
          feedbacks_pendentes: number | null
          ids_vagas_atencao: string[] | null
          media_dias_fechamento: number | null
          taxa_aprovacao: number | null
          vagas_abertas: number | null
          vagas_atencao: number | null
        }
        Relationships: []
      }
      feedbacks_active: {
        Row: {
          atualizado_em: string | null
          author_user_id: string | null
          avaliacao: number | null
          candidato_id: string | null
          conteudo: string | null
          criado_em: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          disposicao: string | null
          etapa: string | null
          id: string | null
          ip_address: string | null
          origem: string | null
          quick_tags: string[] | null
          request_id: string | null
          sender_email: string | null
          sender_name: string | null
          tipo: string | null
          user_agent: string | null
          vaga_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          author_user_id?: string | null
          avaliacao?: number | null
          candidato_id?: string | null
          conteudo?: string | null
          criado_em?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disposicao?: string | null
          etapa?: string | null
          id?: string | null
          ip_address?: string | null
          origem?: string | null
          quick_tags?: string[] | null
          request_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tipo?: string | null
          user_agent?: string | null
          vaga_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          author_user_id?: string | null
          avaliacao?: number | null
          candidato_id?: string | null
          conteudo?: string | null
          criado_em?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          disposicao?: string | null
          etapa?: string | null
          id?: string | null
          ip_address?: string | null
          origem?: string | null
          quick_tags?: string[] | null
          request_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tipo?: string | null
          user_agent?: string | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_recruitment_kpis: {
        Row: {
          calculated_at: string | null
          kpis_data: Json | null
          metric_type: string | null
        }
        Relationships: []
      }
      vagas_active: {
        Row: {
          beneficios: string[] | null
          beneficios_outros: string | null
          complexidade: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial: boolean | null
          created_by: string | null
          criado_em: string | null
          cs_id: string | null
          cs_responsavel: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          deletion_type: string | null
          dias_semana: string[] | null
          empresa: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string | null
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          motivo_confidencial: string | null
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id: string | null
          recrutador: string | null
          recrutador_id: string | null
          requisitos_desejaveis: string | null
          requisitos_obrigatorios: string | null
          responsabilidades: string | null
          salario_max: number | null
          salario_min: number | null
          salario_modalidade: string | null
          solicitante_email: string | null
          solicitante_nome: string | null
          solicitante_telefone: string | null
          source: string | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at: string | null
          status_order: number | null
          status_slug: string | null
          tipo_contratacao: string | null
          titulo: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          complexidade?: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial?: boolean | null
          created_by?: string | null
          criado_em?: string | null
          cs_id?: string | null
          cs_responsavel?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          dias_semana?: string[] | null
          empresa?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string | null
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_confidencial?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id?: string | null
          recrutador?: string | null
          recrutador_id?: string | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: number | null
          salario_min?: number | null
          salario_modalidade?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          complexidade?: Database["public"]["Enums"]["complexidade_vaga"] | null
          confidencial?: boolean | null
          created_by?: string | null
          criado_em?: string | null
          cs_id?: string | null
          cs_responsavel?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          deletion_type?: string | null
          dias_semana?: string[] | null
          empresa?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string | null
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_confidencial?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_vaga"] | null
          recruiter_id?: string | null
          recrutador?: string | null
          recrutador_id?: string | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: number | null
          salario_min?: number | null
          salario_modalidade?: string | null
          solicitante_email?: string | null
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vagas_status_slug"
            columns: ["status_slug"]
            isOneToOne: false
            referencedRelation: "vaga_status_ref"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "vagas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_recrutador_id_fkey"
            columns: ["recrutador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vagas_public_view: {
        Row: {
          beneficios: string[] | null
          beneficios_outros: string | null
          criado_em: string | null
          empresa: string | null
          id: string | null
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          requisitos_desejaveis: string | null
          requisitos_obrigatorios: string | null
          responsabilidades: string | null
          salario_max: number | null
          salario_min: number | null
          salario_modalidade: string | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_slug: string | null
          tipo_contratacao: string | null
          titulo: string | null
        }
        Insert: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          criado_em?: string | null
          empresa?: string | null
          id?: string | null
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: never
          salario_min?: never
          salario_modalidade?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo?: string | null
        }
        Update: {
          beneficios?: string[] | null
          beneficios_outros?: string | null
          criado_em?: string | null
          empresa?: string | null
          id?: string | null
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          requisitos_desejaveis?: string | null
          requisitos_obrigatorios?: string | null
          responsabilidades?: string | null
          salario_max?: never
          salario_min?: never
          salario_modalidade?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_slug?: string | null
          tipo_contratacao?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vagas_status_slug"
            columns: ["status_slug"]
            isOneToOne: false
            referencedRelation: "vaga_status_ref"
            referencedColumns: ["slug"]
          },
        ]
      }
      view_candidate_tags: {
        Row: {
          added_at: string | null
          added_by: string | null
          added_reason: string | null
          candidate_id: string | null
          category: string | null
          label: string | null
          tag_id: string | null
        }
        Relationships: []
      }
      vw_benchmark_recorte: {
        Row: {
          cidade: string | null
          funcao_norm: string | null
          media_salario_pleno: number | null
          porte: string | null
          qtd_estudos: number | null
          senioridade: string | null
          setor: string | null
          uf: string | null
        }
        Relationships: []
      }
      vw_candidato_rating: {
        Row: {
          candidato_id: string | null
          media_rating: number | null
          qtd_avaliacoes: number | null
          qtd_feedbacks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "view_candidate_tags"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "feedbacks_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "vw_candidatos_por_vaga"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_candidatos_por_vaga: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          cs_nome: string | null
          email: string | null
          id: string | null
          nome_completo: string | null
          recrutador_nome: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          telefone: string | null
          total_feedbacks: number | null
          ultimo_feedback: string | null
          vaga_empresa: string | null
          vaga_relacionada_id: string | null
          vaga_titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vagas_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vaga_relacionada_id_fkey"
            columns: ["vaga_relacionada_id"]
            isOneToOne: false
            referencedRelation: "vw_vagas_cliente_detalhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_vagas_cliente_detalhadas: {
        Row: {
          beneficios: string[] | null
          candidatos_contratados: number | null
          candidatos_sem_feedback: number | null
          cliente_id: string | null
          criado_em: string | null
          cs_email: string | null
          cs_id: string | null
          cs_nome: string | null
          empresa: string | null
          id: string | null
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          recrutador_email: string | null
          recrutador_id: string | null
          recrutador_nome: string | null
          salario_max: number | null
          salario_min: number | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_slug: string | null
          tipo_contratacao: string | null
          titulo: string | null
          total_candidatos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vagas_status_slug"
            columns: ["status_slug"]
            isOneToOne: false
            referencedRelation: "vaga_status_ref"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "vagas_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_recrutador_id_fkey"
            columns: ["recrutador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assess_deletion_risk: {
        Args: { p_resource_id: string; p_resource_type: string }
        Returns: string
      }
      business_days_between: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      can_manage_user_roles: { Args: never; Returns: boolean }
      can_submit_feedback: { Args: { p_request_id: string }; Returns: boolean }
      can_view_analytics: { Args: never; Returns: boolean }
      cleanup_expired_pdf_imports: { Args: never; Returns: undefined }
      cleanup_old_submission_logs: { Args: never; Returns: undefined }
      compute_audit_event_hash: {
        Args: {
          p_action: string
          p_actor: Json
          p_client: Json
          p_correlation_id: string
          p_payload: Json
          p_prev_hash: string
          p_resource: Json
          p_timestamp_utc: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_body?: string
          p_job_id?: string
          p_kind: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      create_notifications_for_users: {
        Args: {
          p_body?: string
          p_job_id?: string
          p_kind: string
          p_title: string
          p_user_ids: string[]
        }
        Returns: number
      }
      create_pre_delete_snapshot: {
        Args: {
          p_correlation_id: string
          p_deletion_type: string
          p_resource_id: string
          p_resource_type: string
          p_snapshot_data: Json
        }
        Returns: string
      }
      get_latest_audit_event_hash: { Args: never; Returns: string }
      get_recruitment_kpis_secure: {
        Args: never
        Returns: {
          calculated_at: string | null
          kpis_data: Json | null
          metric_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_recruitment_kpis"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_share_link_by_token: {
        Args: { p_token: string }
        Returns: {
          active: boolean
          created_at: string
          expires_at: string
          id: string
          max_submissions: number
          share_config: Json
          submissions_count: number
          token: string
          vaga_id: string
        }[]
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      get_user_roles: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_active_share_link: { Args: { p_vaga_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_actor: Json
          p_client?: Json
          p_correlation_id?: string
          p_payload?: Json
          p_resource: Json
        }
        Returns: string
      }
      map_legacy_status_to_slug: {
        Args: { old_status: string }
        Returns: string
      }
      refresh_recruitment_kpis: { Args: never; Returns: undefined }
      validate_feedback_token: {
        Args: { p_token: string }
        Returns: {
          allow_multiple: boolean
          candidato_id: string
          expires_at: string
          id: string
          recrutador_id: string
          vaga_id: string
        }[]
      }
      verify_audit_chain: {
        Args: { p_from_timestamp?: string; p_to_timestamp?: string }
        Returns: {
          first_invalid_event_id: string
          invalid_count: number
          is_valid: boolean
          total_events: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "recrutador" | "viewer" | "cs" | "cliente" | "client"
      area_candidato:
        | "RH"
        | "Vendas"
        | "Financeiro"
        | "Marketing"
        | "Operações"
        | "TI"
        | "Administrativo"
        | "Comercial"
        | "Logística"
        | "Outros"
      complexidade_vaga: "Baixa" | "Média" | "Alta" | "Muito Alta"
      criteria_category:
        | "hard_skills"
        | "soft_skills"
        | "experiencia"
        | "fit_cultural"
        | "outros"
      modelo_trabalho: "Presencial" | "Híbrido" | "Remoto"
      nivel_candidato:
        | "Estagiário"
        | "Júnior"
        | "Pleno"
        | "Sênior"
        | "Liderança"
      origem_candidatura:
        | "linkedin"
        | "infojobs"
        | "catho"
        | "indicacao"
        | "site_empresa"
        | "importacao_xls"
        | "outro"
      prioridade_vaga: "Baixa" | "Normal" | "Alta" | "Crítica"
      resultado_historico:
        | "Aprovado"
        | "Reprovado"
        | "Contratado"
        | "Em andamento"
      scale_type: "rating_1_5" | "text_options"
      scorecard_recommendation: "strong_yes" | "yes" | "maybe" | "no"
      status_candidato:
        | "Banco de Talentos"
        | "Selecionado"
        | "Entrevista rhello"
        | "Reprovado rhello"
        | "Aprovado rhello"
        | "Entrevistas Solicitante"
        | "Reprovado Solicitante"
        | "Aprovado Solicitante"
        | "Contratado"
        | "Reprovado Rhello"
        | "Aprovado Rhello"
      status_vaga:
        | "A iniciar"
        | "Discovery"
        | "Triagem"
        | "Entrevistas Rhello"
        | "Aguardando retorno do cliente"
        | "Apresentação de Candidatos"
        | "Entrevista cliente"
        | "Em processo de contratação"
        | "Concluído"
        | "Cancelada"
      user_type: "rhello" | "external"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "recrutador", "viewer", "cs", "cliente", "client"],
      area_candidato: [
        "RH",
        "Vendas",
        "Financeiro",
        "Marketing",
        "Operações",
        "TI",
        "Administrativo",
        "Comercial",
        "Logística",
        "Outros",
      ],
      complexidade_vaga: ["Baixa", "Média", "Alta", "Muito Alta"],
      criteria_category: [
        "hard_skills",
        "soft_skills",
        "experiencia",
        "fit_cultural",
        "outros",
      ],
      modelo_trabalho: ["Presencial", "Híbrido", "Remoto"],
      nivel_candidato: ["Estagiário", "Júnior", "Pleno", "Sênior", "Liderança"],
      origem_candidatura: [
        "linkedin",
        "infojobs",
        "catho",
        "indicacao",
        "site_empresa",
        "importacao_xls",
        "outro",
      ],
      prioridade_vaga: ["Baixa", "Normal", "Alta", "Crítica"],
      resultado_historico: [
        "Aprovado",
        "Reprovado",
        "Contratado",
        "Em andamento",
      ],
      scale_type: ["rating_1_5", "text_options"],
      scorecard_recommendation: ["strong_yes", "yes", "maybe", "no"],
      status_candidato: [
        "Banco de Talentos",
        "Selecionado",
        "Entrevista rhello",
        "Reprovado rhello",
        "Aprovado rhello",
        "Entrevistas Solicitante",
        "Reprovado Solicitante",
        "Aprovado Solicitante",
        "Contratado",
        "Reprovado Rhello",
        "Aprovado Rhello",
      ],
      status_vaga: [
        "A iniciar",
        "Discovery",
        "Triagem",
        "Entrevistas Rhello",
        "Aguardando retorno do cliente",
        "Apresentação de Candidatos",
        "Entrevista cliente",
        "Em processo de contratação",
        "Concluído",
        "Cancelada",
      ],
      user_type: ["rhello", "external"],
    },
  },
} as const

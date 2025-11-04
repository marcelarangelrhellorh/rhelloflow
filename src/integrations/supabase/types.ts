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
          feedback: string | null
          id: string
          linkedin: string | null
          nivel: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string
          parecer_final: string | null
          pontos_desenvolver: string | null
          pontos_fortes: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          recrutador: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          telefone: string | null
          total_feedbacks: number
          ultimo_feedback: string | null
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
          feedback?: string | null
          id?: string
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo: string
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number
          ultimo_feedback?: string | null
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
          feedback?: string | null
          id?: string
          linkedin?: string | null
          nivel?: Database["public"]["Enums"]["nivel_candidato"] | null
          nome_completo?: string
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number
          ultimo_feedback?: string | null
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
          tipo: string
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
          tipo: string
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
          tipo?: string
          vaga_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          full_name: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: string | null
        }
        Relationships: []
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
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
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
          empresa: string
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
          source: string | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at: string | null
          status_order: number | null
          status_slug: string | null
          titulo: string
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
          empresa: string
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
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
          titulo: string
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
          empresa?: string
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
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
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
          parecer_final: string | null
          pontos_desenvolver: string | null
          pontos_fortes: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          recrutador: string | null
          status: Database["public"]["Enums"]["status_candidato"] | null
          telefone: string | null
          total_feedbacks: number | null
          ultimo_feedback: string | null
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
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number | null
          ultimo_feedback?: string | null
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
          parecer_final?: string | null
          pontos_desenvolver?: string | null
          pontos_fortes?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          recrutador?: string | null
          status?: Database["public"]["Enums"]["status_candidato"] | null
          telefone?: string | null
          total_feedbacks?: number | null
          ultimo_feedback?: string | null
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
          tipo: string | null
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
          tipo?: string | null
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
          tipo?: string | null
          vaga_id?: string | null
        }
        Relationships: [
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
        ]
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
          source: string | null
          status: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at: string | null
          status_order: number | null
          status_slug: string | null
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
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
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
          source?: string | null
          status?: Database["public"]["Enums"]["status_vaga"] | null
          status_changed_at?: string | null
          status_order?: number | null
          status_slug?: string | null
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
      get_user_role: { Args: { user_id: string }; Returns: string }
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
      reports_overview: {
        Args: {
          cliente_param?: string
          end_date: string
          recrutador_param?: string
          start_date: string
        }
        Returns: Json
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
      app_role: "admin" | "recrutador" | "viewer"
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
      modelo_trabalho: "Presencial" | "Híbrido" | "Remoto"
      nivel_candidato:
        | "Estagiário"
        | "Júnior"
        | "Pleno"
        | "Sênior"
        | "Liderança"
      prioridade_vaga: "Baixa" | "Normal" | "Alta" | "Crítica"
      resultado_historico:
        | "Aprovado"
        | "Reprovado"
        | "Contratado"
        | "Em andamento"
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
      app_role: ["admin", "recrutador", "viewer"],
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
      modelo_trabalho: ["Presencial", "Híbrido", "Remoto"],
      nivel_candidato: ["Estagiário", "Júnior", "Pleno", "Sênior", "Liderança"],
      prioridade_vaga: ["Baixa", "Normal", "Alta", "Crítica"],
      resultado_historico: [
        "Aprovado",
        "Reprovado",
        "Contratado",
        "Em andamento",
      ],
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
    },
  },
} as const

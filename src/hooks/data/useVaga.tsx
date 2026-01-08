import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  empresa_id: string | null;
  status: string;
  status_slug: string;
  status_order: number;
  criado_em: string;
  confidencial: boolean | null;
  motivo_confidencial: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  recrutador: string | null;
  cs_responsavel: string | null;
  complexidade: string | null;
  prioridade: string | null;
  salario_min: number | null;
  salario_max: number | null;
  salario_modalidade: string | null;
  modelo_trabalho: string | null;
  tipo_contratacao: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: string[] | null;
  beneficios: string[] | null;
  beneficios_outros: string | null;
  requisitos_obrigatorios: string | null;
  requisitos_desejaveis: string | null;
  responsabilidades: string | null;
  observacoes: string | null;
  source: string | null;
  data_abertura: string | null;
};

export function useVaga(id: string | undefined) {
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    loadVaga();

    // Subscribe to real-time updates for this job
    const vagaChannel = supabase
      .channel(`job-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vagas',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setVaga(payload.new as Vaga);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vagaChannel);
    };
  }, [id]);

  const loadVaga = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("vagas")
        .select(`
          *,
          recrutador_user:users!vagas_recrutador_id_fkey(name),
          cs_user:users!vagas_cs_id_fkey(name)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (fetchError) throw fetchError;

      // Se a vaga foi deletada
      if (data.deleted_at) {
        throw new Error("Vaga excluída");
      }

      // Mesclar nome do recrutador e CS do JOIN
      setVaga({
        ...data,
        recrutador: data.recrutador_user?.name || data.recrutador || null,
        cs_responsavel: data.cs_user?.name || data.cs_responsavel || null,
        tipo_contratacao: (data as any).tipo_contratacao || null,
      });
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao carregar vaga:", error);
      setError(error);
      
      if (error.message === "Vaga excluída") {
        toast({
          title: "Vaga excluída",
          description: "Esta vaga foi excluída e não está mais disponível.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateVaga = (updates: Partial<Vaga>) => {
    if (vaga) {
      setVaga({ ...vaga, ...updates });
    }
  };

  return { vaga, loading, error, reload: loadVaga, updateVaga };
}

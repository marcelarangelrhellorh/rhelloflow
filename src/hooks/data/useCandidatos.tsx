import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Candidato = {
  id: string;
  nome_completo: string;
  status: string;
  criado_em: string;
};

export function useCandidatos(vagaId: string | undefined) {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [candidatoContratado, setCandidatoContratado] = useState<Candidato | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vagaId) {
      setLoading(false);
      return;
    }

    loadCandidatos();

    // Subscribe to real-time updates for candidates
    const candidatosChannel = supabase
      .channel(`job-candidatos-${vagaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidatos',
          filter: `vaga_relacionada_id=eq.${vagaId}`,
        },
        () => {
          loadCandidatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(candidatosChannel);
    };
  }, [vagaId]);

  const loadCandidatos = async () => {
    if (!vagaId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("candidatos")
        .select("id, nome_completo, status, criado_em")
        .eq("vaga_relacionada_id", vagaId)
        .order("criado_em", { ascending: false });

      if (fetchError) throw fetchError;

      setCandidatos(data || []);

      // Buscar candidato contratado
      const contratado = (data || []).find((c) => c.status === "Contratado");
      setCandidatoContratado(contratado || null);
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao carregar candidatos:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    candidatos,
    candidatoContratado,
    loading,
    error,
    reload: loadCandidatos,
  };
}

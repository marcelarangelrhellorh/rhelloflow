import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TipoEvento } from "@/lib/vagaEventos";

export type VagaEvento = {
  id: string;
  tipo: TipoEvento;
  descricao: string;
  created_at: string;
  payload: any;
};

export function useVagaEventos(vagaId: string | undefined) {
  const [eventos, setEventos] = useState<VagaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vagaId) {
      setLoading(false);
      return;
    }

    loadEventos();

    // Subscribe to real-time updates for events
    const eventosChannel = supabase
      .channel(`job-eventos-${vagaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vaga_eventos',
          filter: `vaga_id=eq.${vagaId}`,
        },
        (payload) => {
          setEventos((prev) => [payload.new as VagaEvento, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventosChannel);
    };
  }, [vagaId]);

  const loadEventos = async () => {
    if (!vagaId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("vaga_eventos")
        .select("*")
        .eq("vaga_id", vagaId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      setEventos((data || []) as VagaEvento[]);
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao carregar eventos:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return { eventos, loading, error, reload: loadEventos };
}

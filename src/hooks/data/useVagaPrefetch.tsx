import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { vagaKeys } from "./useVagaQuery";
import { candidatosKeys } from "./useCandidatosQuery";
import { vagaEventosKeys } from "./useVagaEventosQuery";
import { vagaTagsKeys } from "./useVagaTagsQuery";
import type { Vaga } from "./useVaga";

/**
 * Hook para prefetch de dados relacionados a uma vaga
 * 
 * Uso:
 * ```tsx
 * const { prefetchVaga, prefetchVagaDetails } = useVagaPrefetch();
 * 
 * // Prefetch básico (só vaga)
 * <Link onMouseEnter={() => prefetchVaga(vagaId)}>Ver vaga</Link>
 * 
 * // Prefetch completo (vaga + candidatos + eventos + tags)
 * <Card onMouseEnter={() => prefetchVagaDetails(vagaId)}>...</Card>
 * ```
 */
export function useVagaPrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch apenas dados da vaga
   * Ideal para hover em links/cards
   */
  const prefetchVaga = async (vagaId: string) => {
    await queryClient.prefetchQuery({
      queryKey: vagaKeys.detail(vagaId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vagas")
          .select(
            `
            *,
            recrutador:users!vagas_recrutador_id_fkey(id, name),
            cs:users!vagas_cs_id_fkey(id, name)
          `
          )
          .eq("id", vagaId)
          .single();

        if (error) throw error;
        if (!data) return null;

        return {
          ...data,
          recrutador: data.recrutador?.name || null,
          cs_responsavel: data.cs?.name || null,
        } as Vaga;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  /**
   * Prefetch dados completos da vaga + candidatos + eventos + tags
   * Ideal para navegação que vai abrir página de detalhes
   */
  const prefetchVagaDetails = async (vagaId: string) => {
    // Prefetch em paralelo para máxima velocidade
    await Promise.all([
      // Vaga
      prefetchVaga(vagaId),

      // Candidatos
      queryClient.prefetchQuery({
        queryKey: candidatosKeys.byVaga(vagaId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from("candidatos")
            .select("id, nome_completo, status, criado_em")
            .eq("vaga_relacionada_id", vagaId)
            .order("criado_em", { ascending: false });

          if (error) throw error;
          return data || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
      }),

      // Eventos (primeiros 20)
      queryClient.prefetchQuery({
        queryKey: vagaEventosKeys.byVaga(vagaId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from("vaga_eventos")
            .select("*")
            .eq("vaga_id", vagaId)
            .order("created_at", { ascending: false })
            .limit(20);

          if (error) throw error;
          return data || [];
        },
        staleTime: 1000 * 60 * 2,
      }),

      // Tags
      queryClient.prefetchQuery({
        queryKey: vagaTagsKeys.byVaga(vagaId),
        queryFn: async () => {
          const { data: tagIds, error: tagsError } = await supabase
            .from("vacancy_tags")
            .select("tag_id")
            .eq("vacancy_id", vagaId);

          if (tagsError) throw tagsError;

          const selectedTagIds = (tagIds || []).map((t) => t.tag_id);

          if (selectedTagIds.length === 0) {
            return { selectedTags: [], vagaTags: [] };
          }

          const { data: tagsData, error: tagsDataError } = await supabase
            .from("tags")
            .select("id, label, category")
            .in("id", selectedTagIds);

          if (tagsDataError) throw tagsDataError;

          return {
            selectedTags: selectedTagIds,
            vagaTags: tagsData || [],
          };
        },
        staleTime: 1000 * 60 * 5,
      }),
    ]);
  };

  /**
   * Prefetch vagas adjacentes em uma lista
   * Útil para prefetch da próxima/anterior vaga ao navegar
   */
  const prefetchAdjacentVagas = async (currentVagaId: string, allVagaIds: string[]) => {
    const currentIndex = allVagaIds.indexOf(currentVagaId);
    
    if (currentIndex === -1) return;

    const adjacentIds: string[] = [];

    // Próxima vaga
    if (currentIndex + 1 < allVagaIds.length) {
      adjacentIds.push(allVagaIds[currentIndex + 1]);
    }

    // Vaga anterior
    if (currentIndex - 1 >= 0) {
      adjacentIds.push(allVagaIds[currentIndex - 1]);
    }

    // Prefetch adjacentes em paralelo
    await Promise.all(adjacentIds.map((id) => prefetchVaga(id)));
  };

  return {
    prefetchVaga,
    prefetchVagaDetails,
    prefetchAdjacentVagas,
  };
}

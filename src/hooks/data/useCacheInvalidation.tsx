import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryConfig";

/**
 * Hook centralizado para invalidação de cache do React Query
 * Garante que os dados sejam atualizados automaticamente após inserções/atualizações
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateVagas = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.vagas.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['kpis'] }),
    ]);
  };

  const invalidateCandidatos = async (vagaId?: string) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: queryKeys.candidatos.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ];
    
    if (vagaId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.candidatos.byVaga(vagaId) })
      );
    }
    
    await Promise.all(promises);
  };

  const invalidateEmpresas = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['empresas'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const invalidateTasks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const invalidateFeedbacks = async (candidatoId?: string) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] }),
    ];
    
    if (candidatoId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ['candidate-feedbacks', candidatoId] })
      );
    }
    
    await Promise.all(promises);
  };

  const invalidateAll = async () => {
    await Promise.all([
      invalidateVagas(),
      invalidateCandidatos(),
      invalidateEmpresas(),
      invalidateTasks(),
    ]);
  };

  return {
    invalidateVagas,
    invalidateCandidatos,
    invalidateEmpresas,
    invalidateTasks,
    invalidateFeedbacks,
    invalidateAll,
  };
}

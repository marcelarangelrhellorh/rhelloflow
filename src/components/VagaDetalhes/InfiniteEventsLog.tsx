import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInfiniteVagaEventos } from "@/hooks/data/useInfiniteVagaEventos";
import type { Candidato } from "@/hooks/data/useCandidatos";
import { Button } from "@/components/ui/button";

type ActivityType = "offer" | "status_change" | "candidate_added" | "process_started";

interface InfiniteEventsLogProps {
  vagaId: string;
  candidatoContratado: Candidato | null;
  vagaStatus: string;
}

export function InfiniteEventsLog({
  vagaId,
  candidatoContratado,
  vagaStatus,
}: InfiniteEventsLogProps) {
  const {
    eventos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteVagaEventos(vagaId);

  const getActivityIcon = (tipo: string) => {
    let activityType: ActivityType = "process_started";
    
    if (tipo === "CANDIDATO_ADICIONADO") {
      activityType = "candidate_added";
    } else if (tipo === "CANDIDATO_MOVIDO") {
      activityType = "status_change";
    } else if (tipo === "ETAPA_ALTERADA") {
      activityType = "status_change";
    } else if (tipo === "FEEDBACK_ADICIONADO") {
      activityType = "status_change";
    }

    switch (activityType) {
      case "status_change":
        return { icon: "add_task", color: "blue" };
      case "candidate_added":
        return { icon: "person_add", color: "blue" };
      case "process_started":
      default:
        return { icon: "event", color: "gray" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mb-6">
        Atividade Recente
      </h2>

      <div className="space-y-6">
        {/* Candidato contratado no topo */}
        {candidatoContratado && vagaStatus === "Concluído" && (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1 size-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                celebration
              </span>
            </div>
            <div>
              <p className="text-primary-text-light dark:text-primary-text-dark font-medium text-sm">
                Candidato "{candidatoContratado.nome_completo}" foi contratado para esta vaga
              </p>
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-xs">
                {format(
                  new Date(candidatoContratado.criado_em),
                  "d 'de' MMMM 'de' yyyy 'às' HH:mm",
                  { locale: ptBR }
                )}
              </p>
            </div>
          </div>
        )}

        {/* Lista de eventos com infinite scroll */}
        {eventos.map((evento) => {
          const { icon, color } = getActivityIcon(evento.tipo);
          const bgColorClass =
            color === "green"
              ? "bg-green-500/20"
              : color === "blue"
              ? "bg-blue-500/20"
              : "bg-gray-500/20";
          const textColorClass =
            color === "green"
              ? "text-green-600 dark:text-green-400"
              : color === "blue"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400";

          return (
            <div key={evento.id} className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 mt-1 size-8 rounded-full ${bgColorClass} flex items-center justify-center`}
              >
                <span className={`material-symbols-outlined ${textColorClass} text-lg`}>
                  {icon}
                </span>
              </div>
              <div>
                <p className="text-primary-text-light dark:text-primary-text-dark font-medium text-sm">
                  {evento.descricao}
                </p>
                <p className="text-secondary-text-light dark:text-secondary-text-dark text-xs">
                  {format(
                    new Date(evento.created_at),
                    "d 'de' MMMM 'de' yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {/* Botão Carregar Mais */}
        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full"
            >
              {isFetchingNextPage ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                  Carregando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">expand_more</span>
                  Carregar eventos anteriores
                </>
              )}
            </Button>
          </div>
        )}

        {!hasNextPage && eventos.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Todos os eventos foram carregados
          </p>
        )}

        {eventos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma atividade registrada ainda
          </p>
        )}
      </div>
    </div>
  );
}

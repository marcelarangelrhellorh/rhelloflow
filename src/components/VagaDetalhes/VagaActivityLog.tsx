import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { VagaEvento } from "@/hooks/data/useVagaEventos";
import type { Candidato } from "@/hooks/data/useCandidatos";
type ActivityType = "offer" | "status_change" | "candidate_added" | "process_started";
interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  date: string;
}
interface VagaActivityLogProps {
  eventos: VagaEvento[];
  candidatoContratado: Candidato | null;
  vagaStatus: string;
}
export function VagaActivityLog({
  eventos,
  candidatoContratado,
  vagaStatus
}: VagaActivityLogProps) {
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "offer":
        return {
          icon: "celebration",
          color: "green"
        };
      case "status_change":
        return {
          icon: "add_task",
          color: "blue"
        };
      case "candidate_added":
        return {
          icon: "person_add",
          color: "blue"
        };
      case "process_started":
        return {
          icon: "event",
          color: "gray"
        };
    }
  };
  const getRecentActivities = (): Activity[] => {
    const activities: Activity[] = [];

    // Add hired candidate at the top if exists
    if (candidatoContratado && vagaStatus === "Concluído") {
      activities.push({
        id: `contratado-${candidatoContratado.id}`,
        type: "offer",
        description: `Candidato "${candidatoContratado.nome_completo}" foi contratado para esta vaga`,
        date: format(new Date(candidatoContratado.criado_em), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
          locale: ptBR
        })
      });
    }

    // Map events to activities
    const eventosAtividades = eventos.map(evento => {
      let type: ActivityType = "process_started";
      if (evento.tipo === "CANDIDATO_ADICIONADO") {
        type = "candidate_added";
      } else if (evento.tipo === "CANDIDATO_MOVIDO") {
        type = "status_change";
      } else if (evento.tipo === "ETAPA_ALTERADA") {
        type = "status_change";
      } else if (evento.tipo === "FEEDBACK_ADICIONADO") {
        type = "status_change";
      }
      return {
        id: evento.id,
        type,
        description: evento.descricao,
        date: format(new Date(evento.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
          locale: ptBR
        })
      };
    });
    return [...activities, ...eventosAtividades];
  };
  const activities = getRecentActivities();
  return <div>
      <h2 className="text-primary-text-light dark:text-primary-text-dark font-bold tracking-tight mb-6 mx-[15px] px-4 py-2 rounded-full text-lg my-[15px] bg-transparent">
        Atividade Recente
      </h2>

      <div className="space-y-6">
        {activities.map(activity => {
        const {
          icon,
          color
        } = getActivityIcon(activity.type);
        const bgColorClass = color === "green" ? "bg-green-500/20" : color === "blue" ? "bg-blue-500/20" : "bg-gray-500/20";
        const textColorClass = color === "green" ? "text-green-600 dark:text-green-400" : color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400";
        return <div key={activity.id} className="flex items-start gap-4">
              <div className={`flex-shrink-0 mt-1 size-8 rounded-full ${bgColorClass} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${textColorClass} text-lg`}>
                  {icon}
                </span>
              </div>
              <div>
                <p className="text-primary-text-light dark:text-primary-text-dark font-medium text-base">
                  {activity.description}
                </p>
                <p className="text-secondary-text-light dark:text-secondary-text-dark text-sm font-semibold">
                  {activity.date}
                </p>
              </div>
            </div>;
      })}
      </div>
    </div>;
}
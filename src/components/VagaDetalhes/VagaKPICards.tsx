import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STAGES } from "@/lib/jobStages";
import type { Vaga } from "@/hooks/data/useVaga";
import type { Candidato } from "@/hooks/data/useCandidatos";
import { VagaTasksCard } from "./VagaTasksCard";

interface VagaKPICardsProps {
  vaga: Vaga;
  candidatos: Candidato[];
  daysOpen: number;
  onStatusChange: (newStatusSlug: string) => void;
}

export function VagaKPICards({ vaga, candidatos, daysOpen, onStatusChange }: VagaKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div className="flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-semibold">
          Etapa Atual da Contratação
        </p>
        <Select
          value={vaga.status_slug || "a_iniciar"}
          onValueChange={onStatusChange}
          disabled={vaga.status_slug === "concluida"}
        >
          <SelectTrigger className="w-full bg-white dark:bg-background-dark border-border hover:bg-primary/5 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {JOB_STAGES.map((stage) => (
              <SelectItem
                key={stage.id}
                value={stage.slug}
                className="cursor-pointer hover:bg-primary/10"
              >
                <span className={vaga.status_slug === stage.slug ? "font-bold" : ""}>
                  {vaga.status_slug === stage.slug && "✅ "}
                  {stage.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {vaga.status_slug === "concluida" && (
          <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">
            Etapa bloqueada - vaga concluída
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
          Candidatos Ativos
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">
          {candidatos.length}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
          Duração do Processo
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">
          {daysOpen} Dias
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
          Modelo de Trabalho
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold">
          {vaga.modelo_trabalho || "Não informado"}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
          Formato da Contratação
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold">
          {vaga.tipo_contratacao || "Não informado"}
        </p>
      </div>

      <VagaTasksCard vagaId={vaga.id} vagaTitulo={vaga.titulo} />
    </div>
  );
}

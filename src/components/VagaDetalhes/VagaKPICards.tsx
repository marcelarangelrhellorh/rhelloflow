import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STAGES } from "@/lib/jobStages";
import type { Vaga } from "@/hooks/data/useVaga";
import type { Candidato } from "@/hooks/data/useCandidatos";
interface VagaKPICardsProps {
  vaga: Vaga;
  candidatos: Candidato[];
  daysOpen: number;
  onStatusChange: (newStatusSlug: string) => void;
}
export function VagaKPICards({
  vaga,
  candidatos,
  daysOpen,
  onStatusChange
}: VagaKPICardsProps) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="flex flex-col gap-2 rounded-lg p-4 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-lg">
        <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-base">
          Etapa Atual da Contratação
        </p>
        <Select value={vaga.status_slug || "discovery"} onValueChange={onStatusChange} disabled={vaga.status_slug === "concluida"}>
          <SelectTrigger className="w-full bg-white dark:bg-background-dark border-border hover:bg-primary/5 transition-colors text-base font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {JOB_STAGES.map(stage => <SelectItem key={stage.id} value={stage.slug} className="cursor-pointer hover:bg-primary/10 text-base">
                <span className={vaga.status_slug === stage.slug ? "font-bold" : ""}>
                  {vaga.status_slug === stage.slug && "✅ "}
                  {stage.name}
                </span>
              </SelectItem>)}
          </SelectContent>
        </Select>
        {vaga.status_slug === "concluida" && <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">
            Etapa bloqueada - vaga concluída
          </p>}
      </div>

      <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-lg">
        <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-base">
          Candidatos Ativos
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark font-bold text-base">
          {candidatos.length}
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-lg">
        <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-base">
          Duração do Processo
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark font-bold text-base">
          {daysOpen} Dias
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-lg">
        <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-base">
          Modelo de Trabalho
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark font-bold text-base">
          {vaga.modelo_trabalho || "Não informado"}
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg p-4 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-lg">
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-semibold">
          Formato da Contratação
        </p>
        <p className="text-primary-text-light dark:text-primary-text-dark font-bold text-base">
          {vaga.tipo_contratacao || "Não informado"}
        </p>
      </div>
    </div>;
}
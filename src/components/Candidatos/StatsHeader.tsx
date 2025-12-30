import { Users } from "lucide-react";

interface StatsHeaderProps {
  total: number;
  byStatus: Record<string, number>;
}

export function StatsHeader({ total, byStatus }: StatsHeaderProps) {
  const activeStatuses = ["Triagem", "Assessment | Teste Técnico", "Entrevista", "Shortlist"];
  const activeCount = Object.entries(byStatus)
    .filter(([status]) => activeStatuses.includes(status))
    .reduce((sum, [, count]) => sum + count, 0);
  const reprovadoCount = byStatus["Reprovado"] || 0;
  const contratadoCount = byStatus["Contratado"] || 0;

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground text-base font-semibold">{total} candidatos</span>
      </div>
      
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 text-base text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-base font-semibold">{activeCount} ativos</span>
        </div>
      )}
      
      {reprovadoCount > 0 && (
        <div className="flex items-center gap-1.5 text-base text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span className="text-base font-semibold">{reprovadoCount} reprovados</span>
        </div>
      )}
      
      {contratadoCount > 0 && (
        <div className="flex items-center gap-1.5 text-base text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span className="text-base font-semibold">{contratadoCount} contratados</span>
        </div>
      )}
    </div>
  );
}

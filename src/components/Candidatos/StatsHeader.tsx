import { Users } from "lucide-react";

interface StatsHeaderProps {
  total: number;
  byStatus: Record<string, number>;
}

export function StatsHeader({ total, byStatus }: StatsHeaderProps) {
  const activeStatuses = ["Selecionado", "Entrevista rhello", "Enviado ao Cliente"];
  const activeCount = Object.entries(byStatus)
    .filter(([status]) => activeStatuses.includes(status))
    .reduce((sum, [, count]) => sum + count, 0);

  const entrevistasCount = byStatus["Entrevistas Solicitante"] || 0;
  const reprovadoRhelloCount = byStatus["Reprovado Rhello"] || 0;
  const contratadoCount = byStatus["Contratado"] || 0;

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[#36404a]" />
        <span className="text-sm font-medium text-[#36404a]">{total} candidatos</span>
      </div>
      
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[#36404a]">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          <span>{activeCount} ativos</span>
        </div>
      )}
      
      {entrevistasCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[#36404a]">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
          <span>{entrevistasCount} entrevistas solicitante</span>
        </div>
      )}
      
      {reprovadoRhelloCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[#36404a]">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
          <span>{reprovadoRhelloCount} reprovado rhello</span>
        </div>
      )}
      
      {contratadoCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[#36404a]">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
          <span>{contratadoCount} contratado</span>
        </div>
      )}
    </div>
  );
}

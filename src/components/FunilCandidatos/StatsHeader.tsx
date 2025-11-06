import { Users, Database } from "lucide-react";

interface StatsHeaderProps {
  totalCandidatosAtivos: number;
  candidatosBancoTalentos: number;
}

export function StatsHeader({
  totalCandidatosAtivos,
  candidatosBancoTalentos,
}: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Total de candidatos ativos */}
      <div className="flex items-center justify-between h-[48px] px-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#36404A]">Candidatos Ativos</p>
          <p className="text-2xl font-bold text-[#00141D]">{totalCandidatosAtivos}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FFCD00]/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-[#FFCD00]" strokeWidth={2} />
        </div>
      </div>

      {/* Candidatos em banco de talentos */}
      <div className="flex items-center justify-between h-[48px] px-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#36404A]">Banco de Talentos</p>
          <p className="text-2xl font-bold text-[#00141D]">{candidatosBancoTalentos}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Database className="h-4 w-4 text-blue-500" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
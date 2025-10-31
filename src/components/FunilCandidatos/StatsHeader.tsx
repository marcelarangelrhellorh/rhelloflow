import { Users, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface StatsHeaderProps {
  totalCandidatosAtivos: number;
  mediaDiasNoFunil: number;
  candidatosEmAtencao: number;
  taxaConversao: number;
}

export function StatsHeader({
  totalCandidatosAtivos,
  mediaDiasNoFunil,
  candidatosEmAtencao,
  taxaConversao,
}: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total de candidatos ativos */}
      <div className="flex items-center justify-between h-[60px] px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-xs text-[#36404A] font-medium">Candidatos Ativos</p>
          <p className="text-xl font-bold text-[#00141D]">{totalCandidatosAtivos}</p>
        </div>
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#FFCD00]/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-[#FFCD00]" strokeWidth={2} />
        </div>
      </div>

      {/* Média de dias no funil */}
      <div className="flex items-center justify-between h-[60px] px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-xs text-[#36404A] font-medium">Média Dias</p>
          <p className="text-xl font-bold text-[#00141D]">{mediaDiasNoFunil}</p>
        </div>
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-blue-500" strokeWidth={2} />
        </div>
      </div>

      {/* Candidatos em atenção */}
      <div className="flex items-center justify-between h-[60px] px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-xs text-[#36404A] font-medium">Em Atenção</p>
          <p className="text-xl font-bold text-[#00141D]">{candidatosEmAtencao}</p>
        </div>
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-orange-500" strokeWidth={2} />
        </div>
      </div>

      {/* Taxa de conversão */}
      <div className="flex items-center justify-between h-[60px] px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
          <p className="text-xs text-[#36404A] font-medium">Taxa Conversão</p>
          <p className="text-xl font-bold text-[#00141D]">{taxaConversao}%</p>
        </div>
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-green-500" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
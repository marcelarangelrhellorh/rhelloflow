import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { AnalyzeScorecards } from "@/components/FunilVagas/AnalyzeScorecards";
import type { Candidato } from "@/hooks/data/useCandidatos";
interface VagaCandidatesTableProps {
  candidatos: Candidato[];
  vagaId: string;
  vagaTitulo: string;
}
export function VagaCandidatesTable({
  candidatos,
  vagaId,
  vagaTitulo
}: VagaCandidatesTableProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const getStatusBadgeClass = (status: string) => {
    if (status === "Oferta Enviada") return "bg-green-500/20 text-green-800 dark:text-green-300";
    if (status === "1ª Entrevista") return "bg-blue-500/20 text-blue-800 dark:text-blue-300";
    return "bg-primary/20 text-primary-text-light dark:text-primary-text-dark";
  };
  return <div className="mt-8 rounded-lg border border-border bg-card">
      {/* Header - Always visible */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-base">Candidatos Ativos</span>
          {candidatos.length > 0 && <span className="ml-2 text-muted-foreground text-base font-semibold">
              ({candidatos.length} candidato{candidatos.length !== 1 ? "s" : ""})
            </span>}
        </div>
        <AnalyzeScorecards vagaId={vagaId} vagaTitulo={vagaTitulo} />
      </button>

      {/* Content - Visible when expanded */}
      {isExpanded && <div className="px-4 pb-4 border-t border-border">
          <div className="overflow-x-auto bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 rounded-lg shadow-sm mt-4">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 dark:border-secondary-text-light/20 text-base text-secondary-text-light dark:text-secondary-text-dark">
                <tr>
                  <th className="p-4 font-semibold">Nome do Candidato</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Última Atualização</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-primary-text-light dark:text-primary-text-dark text-base">
                {candidatos.length === 0 ? <tr>
                    <td colSpan={4} className="p-8 text-center text-secondary-text-light dark:text-secondary-text-dark">
                      Nenhum candidato relacionado a esta vaga
                    </td>
                  </tr> : candidatos.map((candidato, index) => <tr key={candidato.id} className={index < candidatos.length - 1 ? "border-b border-gray-200 dark:border-secondary-text-light/20" : ""}>
                      <td className="p-4 font-semibold text-base">{candidato.nome_completo}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${getStatusBadgeClass(candidato.status)}`}>
                          {candidato.status}
                        </span>
                      </td>
                      <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                        {format(new Date(candidato.criado_em), "d 'de' MMM", {
                    locale: ptBR
                  })}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => navigate(`/candidatos/${candidato.id}`)} className="text-primary font-bold text-base hover:brightness-95 transition-all">
                          Visualizar
                        </button>
                      </td>
                    </tr>)}
              </tbody>
            </table>
          </div>
        </div>}
    </div>;
}
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnalyzeScorecards } from "@/components/FunilVagas/AnalyzeScorecards";
import type { Candidato } from "@/hooks/data/useCandidatos";

interface VagaCandidatesTableProps {
  candidatos: Candidato[];
  vagaId: string;
  vagaTitulo: string;
}

export function VagaCandidatesTable({ candidatos, vagaId, vagaTitulo }: VagaCandidatesTableProps) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status: string) => {
    if (status === "Oferta Enviada")
      return "bg-green-500/20 text-green-800 dark:text-green-300";
    if (status === "1ª Entrevista")
      return "bg-blue-500/20 text-blue-800 dark:text-blue-300";
    return "bg-primary/20 text-primary-text-light dark:text-primary-text-dark";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight">
          Candidatos Ativos
        </h2>
        <AnalyzeScorecards vagaId={vagaId} vagaTitulo={vagaTitulo} />
      </div>

      <div className="overflow-x-auto bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 rounded-lg shadow-sm">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 dark:border-secondary-text-light/20 text-sm text-secondary-text-light dark:text-secondary-text-dark">
            <tr>
              <th className="p-4 font-medium">Nome do Candidato</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Última Atualização</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-primary-text-light dark:text-primary-text-dark text-sm">
            {candidatos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-secondary-text-light dark:text-secondary-text-dark">
                  Nenhum candidato relacionado a esta vaga
                </td>
              </tr>
            ) : (
              candidatos.map((candidato, index) => (
                <tr
                  key={candidato.id}
                  className={index < candidatos.length - 1 ? "border-b border-gray-200 dark:border-secondary-text-light/20" : ""}
                >
                  <td className="p-4 font-medium">{candidato.nome_completo}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${getStatusBadgeClass(
                        candidato.status
                      )}`}
                    >
                      {candidato.status}
                    </span>
                  </td>
                  <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark">
                    {format(new Date(candidato.criado_em), "d 'de' MMM", { locale: ptBR })}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/candidatos/${candidato.id}`)}
                      className="text-primary font-bold text-sm hover:brightness-95 transition-all"
                    >
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

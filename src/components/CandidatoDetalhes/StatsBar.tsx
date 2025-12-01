import { Clock, MessageSquare, Briefcase, Star } from "lucide-react";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
interface StatsBarProps {
  criadoEm: string;
  ultimoFeedback?: string | null;
  processosParticipados: number;
  mediaAvaliacao?: number | null;
  qtdAvaliacoes?: number;
  totalFeedbacks?: number;
}
export function StatsBar({
  criadoEm,
  ultimoFeedback,
  processosParticipados,
  mediaAvaliacao,
  qtdAvaliacoes = 0,
  totalFeedbacks = 0
}: StatsBarProps) {
  const diasNaEtapa = getBusinessDaysFromNow(criadoEm);
  const ultimoFeedbackFormatado = ultimoFeedback ? new Date(ultimoFeedback).toLocaleDateString("pt-BR") : "—";
  return <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border dark:border-secondary-text-light/20 shadow-lg border-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-warning/10 p-2">
            <Clock className="h-5 w-5 text-warning" />
          </div>
        </div>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">Tempo na etapa</p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">{diasNaEtapa} dias</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border dark:border-secondary-text-light/20 shadow-lg border-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-info/10 p-2">
            <MessageSquare className="h-5 w-5 text-info" />
          </div>
        </div>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">Feedbacks</p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">{totalFeedbacks}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border dark:border-secondary-text-light/20 shadow-lg border-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-info/10 p-2">
            <Clock className="h-5 w-5 text-info" />
          </div>
        </div>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">Último Feedback</p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold">{ultimoFeedbackFormatado}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border dark:border-secondary-text-light/20 shadow-lg border-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-primary/10 p-2">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">Processos</p>
        <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">{processosParticipados}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border dark:border-secondary-text-light/20 shadow-lg border-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <div className="rounded-full bg-success/10 p-2">
            <Star className="h-5 w-5 text-success" />
          </div>
        </div>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">Avaliação</p>
        {mediaAvaliacao && qtdAvaliacoes > 0 ? <div className="flex items-center gap-2">
            <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">{mediaAvaliacao.toFixed(1)} ★</p>
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-base">({qtdAvaliacoes})</p>
          </div> : <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">—</p>}
      </div>
    </div>;
}
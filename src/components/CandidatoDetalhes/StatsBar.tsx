import { Card, CardContent } from "@/components/ui/card";
import { Clock, MessageSquare, Briefcase, Star } from "lucide-react";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { StarRating } from "@/components/ui/star-rating";

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
  totalFeedbacks = 0,
}: StatsBarProps) {
  const diasNaEtapa = getBusinessDaysFromNow(criadoEm);
  
  const ultimoFeedbackFormatado = ultimoFeedback
    ? new Date(ultimoFeedback).toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <Card className="border-l-4 border-l-warning">
        <CardContent className="flex items-center gap-2 p-3">
          <div className="rounded-full bg-warning/10 p-1.5">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Tempo na etapa</p>
            <p className="text-sm font-bold text-card-foreground">{diasNaEtapa} dias</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-info">
        <CardContent className="flex items-center gap-2 p-3">
          <div className="rounded-full bg-info/10 p-1.5">
            <MessageSquare className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Feedbacks</p>
            <p className="text-sm font-bold text-card-foreground">{totalFeedbacks}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-info">
        <CardContent className="flex items-center gap-2 p-3">
          <div className="rounded-full bg-info/10 p-1.5">
            <Clock className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Último</p>
            <p className="text-sm font-bold text-card-foreground">{ultimoFeedbackFormatado}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex items-center gap-2 p-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Processos</p>
            <p className="text-sm font-bold text-card-foreground">{processosParticipados}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-success">
        <CardContent className="flex items-center gap-2 p-3">
          <div className="rounded-full bg-success/10 p-1.5">
            <Star className="h-4 w-4 text-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Avaliação</p>
            {mediaAvaliacao && qtdAvaliacoes > 0 ? (
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-card-foreground">{mediaAvaliacao.toFixed(1)} ★</p>
                <p className="text-xs text-muted-foreground">({qtdAvaliacoes})</p>
              </div>
            ) : (
              <p className="text-sm font-bold text-card-foreground">—</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Clock, MessageSquare, Briefcase, Star, RefreshCw } from "lucide-react";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";

interface StatsBarProps {
  criadoEm: string;
  ultimoFeedback?: string | null;
  processosParticipados: number;
  realocacoes: number;
  totalFeedbacks?: number;
}

export function StatsBar({
  criadoEm,
  ultimoFeedback,
  processosParticipados,
  realocacoes,
  totalFeedbacks = 0,
}: StatsBarProps) {
  const diasNaEtapa = getBusinessDaysFromNow(criadoEm);
  
  const ultimoFeedbackFormatado = ultimoFeedback
    ? new Date(ultimoFeedback).toLocaleDateString("pt-BR")
    : "Nenhum";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-warning/10 p-2">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tempo na etapa</p>
            <p className="text-lg font-bold text-card-foreground">{diasNaEtapa} dias</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-info/10 p-2">
            <MessageSquare className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Feedbacks / Último</p>
            <p className="text-lg font-bold text-card-foreground">{totalFeedbacks} / {ultimoFeedbackFormatado}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-primary/10 p-2">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processos</p>
            <p className="text-lg font-bold text-card-foreground">{processosParticipados}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-success/10 p-2">
            <Star className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avaliação</p>
            <p className="text-lg font-bold text-card-foreground">—</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-muted/20 p-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Realocações</p>
            <p className="text-lg font-bold text-card-foreground">{realocacoes}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

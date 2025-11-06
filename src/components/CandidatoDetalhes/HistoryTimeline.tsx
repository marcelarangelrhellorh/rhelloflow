import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, User, Calendar, ExternalLink } from "lucide-react";
import { businessDaysBetween } from "@/lib/dateUtils";

interface HistoricoItem {
  id: string;
  resultado: string;
  feedback: string | null;
  data: string | null;
  recrutador: string | null;
  vaga_id: string | null;
}

interface HistoryTimelineProps {
  historico: HistoricoItem[];
  onVagaClick?: (vagaId: string) => void;
}

const resultadoColors: Record<string, string> = {
  "Contratado": "bg-success/10 text-success border-success/20",
  "Aprovado": "bg-success/10 text-success border-success/20",
  "Reprovado": "bg-destructive/10 text-destructive border-destructive/20",
  "Em andamento": "bg-warning/10 text-warning border-warning/20",
  "Banco de Talentos": "bg-muted/10 text-muted-foreground border-muted",
};

const resultadoIcons: Record<string, string> = {
  "Contratado": "✅",
  "Aprovado": "✅",
  "Reprovado": "🔴",
  "Em andamento": "🟡",
  "Banco de Talentos": "⚪",
};

export function HistoryTimeline({ historico, onVagaClick }: HistoryTimelineProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    const days = businessDaysBetween(startDate, endDate);
    return days > 0 ? `${days} dias` : "< 1 dia";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Processos</CardTitle>
      </CardHeader>
      <CardContent>
        {historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted/20 p-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum histórico de processos registrado
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historico.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Badge
                      variant="outline"
                      className={`${
                        resultadoColors[item.resultado] || resultadoColors["Banco de Talentos"]
                      } border font-bold rounded-lg px-4 py-2 text-sm`}
                    >
                      <span className="mr-2 text-base">{resultadoIcons[item.resultado] || "⚪"}</span>
                      {item.resultado}
                    </Badge>
                  </div>
                  {item.data && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.data)}
                    </div>
                  )}
                </div>

                {/* Vaga Info */}
                {item.vaga_id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mb-2 text-info hover:text-info/80"
                    onClick={() => onVagaClick?.(item.vaga_id!)}
                  >
                    <Briefcase className="mr-1 h-3.5 w-3.5" />
                    <span className="text-sm">Ver vaga relacionada</span>
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                )}

                {/* Recruiter */}
                {item.recrutador && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <User className="h-3.5 w-3.5" />
                    <span>{item.recrutador}</span>
                  </div>
                )}

                {/* Feedback */}
                {item.feedback && (
                  <p className="text-sm text-card-foreground bg-muted/20 rounded p-2 mt-2">
                    {item.feedback}
                  </p>
                )}

                {/* Duration (if we have date ranges) */}
                {index < historico.length - 1 && item.data && historico[index + 1].data && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Duração: {calculateDuration(historico[index + 1].data, item.data)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

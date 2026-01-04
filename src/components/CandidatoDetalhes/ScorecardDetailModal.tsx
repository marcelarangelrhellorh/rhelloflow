import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Evaluation {
  criteria_name: string;
  criteria_category: string;
  criteria_weight: number;
  score: number;
  notes: string | null;
}

interface Scorecard {
  id: string;
  template_name: string;
  evaluator_name: string;
  comments: string | null;
  total_score: number;
  match_percentage: number;
  created_at: string;
  vaga_titulo?: string | null;
  evaluations: Evaluation[];
}

interface ScorecardDetailModalProps {
  scorecard: Scorecard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  hard_skills: 'Hard Skills',
  soft_skills: 'Soft Skills',
  experiencia: 'Experiência',
  fit_cultural: 'Fit Cultural',
  outros: 'Outros',
};

const categoryColors: Record<string, string> = {
  hard_skills: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  soft_skills: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  experiencia: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  fit_cultural: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  outros: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-5 w-5",
            star <= score
              ? 'fill-[#FFCD00] text-[#FFCD00]'
              : 'text-gray-300'
          )}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground font-medium">({score}/5)</span>
    </div>
  );
}

export function ScorecardDetailModal({
  scorecard,
  open,
  onOpenChange,
}: ScorecardDetailModalProps) {
  if (!scorecard) return null;

  const matchPercentage = scorecard.match_percentage ?? 0;
  const evaluations = scorecard.evaluations ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-bold">Detalhes da Avaliação</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 pb-6 space-y-6">
            {/* Header Info */}
            <div className="rounded-lg border bg-muted/30 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">{scorecard.template_name}</h3>
                  {scorecard.vaga_titulo && (
                    <Badge variant="outline" className="text-sm">
                      {scorecard.vaga_titulo}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {matchPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Match Score</div>
                </div>
              </div>

              <Progress value={matchPercentage} className="h-2.5" />

              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs font-bold">
                      {getInitials(scorecard.evaluator_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{scorecard.evaluator_name}</span>
                </div>
                {scorecard.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {format(new Date(scorecard.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Criteria Section */}
            {evaluations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">
                  Critérios Avaliados ({evaluations.length})
                </h3>
                <Separator />
                <div className="space-y-4">
                  {evaluations.map((evaluation, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                categoryColors[evaluation.criteria_category] || categoryColors.outros
                              }`}
                            >
                              {categoryLabels[evaluation.criteria_category] ||
                                evaluation.criteria_category || 'Outros'}
                            </Badge>
                            <span className="font-semibold text-base">
                              {evaluation.criteria_name}
                            </span>
                          </div>
                          <StarRating score={evaluation.score} />
                        </div>
                        {evaluation.criteria_weight > 0 && (
                          <div className="text-right shrink-0">
                            <span className="text-sm font-semibold text-muted-foreground">
                              Peso: {evaluation.criteria_weight}%
                            </span>
                          </div>
                        )}
                      </div>
                      {evaluation.notes && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground italic">
                            "{evaluation.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Comments */}
            {scorecard.comments && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">
                  Comentários Gerais
                </h3>
                <Separator />
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{scorecard.comments}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Star, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Evaluation {
  id: string;
  score: number | null;
  notes: string | null;
  text_answer: string | null;
  selected_option_index: number | null;
  is_correct: boolean | null;
  criteria: {
    name: string;
    description: string | null;
    category: string;
    weight: number;
    question_type: string;
    options: any;
  };
}

interface TechnicalTestResultModalProps {
  scorecardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experiencia: "Experiência",
  fit_cultural: "Fit Cultural",
  outros: "Outros"
};

const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200"
};

export function TechnicalTestResultModal({
  scorecardId,
  open,
  onOpenChange
}: TechnicalTestResultModalProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && scorecardId) {
      loadResults();
    }
  }, [open, scorecardId]);

  async function loadResults() {
    try {
      setLoading(true);

      // Load scorecard info
      const { data: scorecardData, error: scorecardError } = await supabase
        .from("candidate_scorecards")
        .select(`
          *,
          scorecard_templates!candidate_scorecards_template_id_fkey(name),
          candidatos(nome_completo)
        `)
        .eq("id", scorecardId)
        .single();

      if (scorecardError) throw scorecardError;
      setScorecard(scorecardData);

      // Load evaluations with criteria
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from("scorecard_evaluations")
        .select(`
          id,
          score,
          notes,
          text_answer,
          selected_option_index,
          is_correct,
          scorecard_criteria!inner(
            name,
            description,
            category,
            weight,
            question_type,
            options,
            display_order
          )
        `)
        .eq("scorecard_id", scorecardId)
        .order("scorecard_criteria(display_order)");

      if (evaluationsError) throw evaluationsError;

      setEvaluations((evaluationsData || []).map((ev: any) => ({
        id: ev.id,
        score: ev.score,
        notes: ev.notes,
        text_answer: ev.text_answer,
        selected_option_index: ev.selected_option_index,
        is_correct: ev.is_correct,
        criteria: {
          name: ev.scorecard_criteria.name,
          description: ev.scorecard_criteria.description,
          category: ev.scorecard_criteria.category,
          weight: ev.scorecard_criteria.weight,
          question_type: ev.scorecard_criteria.question_type || "rating",
          options: ev.scorecard_criteria.options
        }
      })));
    } catch (error) {
      console.error("Erro ao carregar resultados:", error);
    } finally {
      setLoading(false);
    }
  }

  function renderAnswer(evaluation: Evaluation) {
    const { criteria } = evaluation;

    switch (criteria.question_type) {
      case "rating":
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={cn(
                  "h-4 w-4",
                  star <= (evaluation.score || 0)
                    ? "fill-[#FFCD00] text-[#FFCD00]"
                    : "text-gray-300"
                )}
              />
            ))}
            <span className="ml-2 text-sm font-medium">{evaluation.score}/5</span>
          </div>
        );

      case "open_text":
        return (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{evaluation.text_answer || "Sem resposta"}</p>
          </div>
        );

      case "multiple_choice":
        const options = criteria.options || [];
        const selectedOption = options[evaluation.selected_option_index ?? -1];
        
        return (
          <div className="space-y-2">
            {options.map((opt: any, index: number) => {
              const isSelected = index === evaluation.selected_option_index;
              const isCorrect = opt.is_correct;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border",
                    isSelected && isCorrect && "bg-green-50 border-green-300",
                    isSelected && !isCorrect && "bg-red-50 border-red-300",
                    !isSelected && isCorrect && "bg-green-50/50 border-green-200",
                    !isSelected && !isCorrect && "bg-muted/30"
                  )}
                >
                  {isSelected && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                  {!isSelected && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  <span className={cn(
                    "text-sm",
                    isSelected && "font-medium"
                  )}>
                    {opt.text}
                  </span>
                </div>
              );
            })}
          </div>
        );

      default:
        return <span className="text-muted-foreground text-sm">Tipo desconhecido</span>;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Respostas do Teste Técnico
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            {scorecard && (
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <h3 className="font-semibold">{scorecard.scorecard_templates?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {scorecard.candidatos?.nome_completo}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {scorecard.match_percentage}%
                  </div>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
              </div>
            )}

            <Progress value={scorecard?.match_percentage || 0} className="h-3" />

            {/* Evaluations */}
            <div className="space-y-4">
              {evaluations.map((evaluation, index) => (
                <Card key={evaluation.id} className="border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", categoryColors[evaluation.criteria.category])}
                          >
                            {categoryLabels[evaluation.criteria.category]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Peso: {evaluation.criteria.weight}%
                          </span>
                          {evaluation.criteria.question_type === "multiple_choice" && (
                            <Badge
                              variant={evaluation.is_correct ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {evaluation.is_correct ? "Correto" : "Incorreto"}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold">{evaluation.criteria.name}</h4>
                        {evaluation.criteria.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {evaluation.criteria.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {renderAnswer(evaluation)}
                    </div>

                    {evaluation.notes && (
                      <div className="flex items-start gap-2 pt-2 border-t">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground">{evaluation.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

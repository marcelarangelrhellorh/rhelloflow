import { useState, useEffect, useCallback } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Star, MessageSquare, Clock, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Evaluation {
  id: string;
  score: number | null;
  notes: string | null;
  text_answer: string | null;
  selected_option_index: number | null;
  is_correct: boolean | null;
  graded_by: string | null;
  graded_at: string | null;
  criteria: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    weight: number;
    question_type: string;
    options: any;
  };
  grader?: {
    nome: string | null;
  } | null;
}

interface TechnicalTestResultModalProps {
  scorecardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScoreUpdated?: () => void;
}

const categoryLabels: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experiencia: "Experiência",
  fit_cultural: "Fit Cultural",
  outros: "Outros"
};

const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200"
};

// Interactive Star Rating Component
function InteractiveStarRating({ 
  score, 
  onRate, 
  disabled = false 
}: { 
  score: number | null; 
  onRate: (score: number) => void;
  disabled?: boolean;
}) {
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const displayScore = hoverScore ?? score ?? 0;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onMouseEnter={() => !disabled && setHoverScore(star)}
          onMouseLeave={() => setHoverScore(null)}
          onClick={() => !disabled && onRate(star)}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              star <= displayScore
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Read-only Star Rating
function ReadOnlyStarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= score
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}

export function TechnicalTestResultModal({
  scorecardId,
  open,
  onOpenChange,
  onScoreUpdated
}: TechnicalTestResultModalProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    if (!scorecardId) return;
    
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

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
          graded_by,
          graded_at,
          scorecard_criteria!inner(
            id,
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

      // Fetch grader names
      const gradedByIds = evaluationsData
        ?.filter(e => e.graded_by)
        .map(e => e.graded_by) || [];
      
      let gradersMap: Record<string, string> = {};
      if (gradedByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', gradedByIds);
        
        gradersMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Usuário';
          return acc;
        }, {} as Record<string, string>);
      }

      setEvaluations((evaluationsData || []).map((ev: any) => ({
        id: ev.id,
        score: ev.score,
        notes: ev.notes,
        text_answer: ev.text_answer,
        selected_option_index: ev.selected_option_index,
        is_correct: ev.is_correct,
        graded_by: ev.graded_by,
        graded_at: ev.graded_at,
        criteria: {
          id: ev.scorecard_criteria.id,
          name: ev.scorecard_criteria.name,
          description: ev.scorecard_criteria.description,
          category: ev.scorecard_criteria.category,
          weight: ev.scorecard_criteria.weight,
          question_type: ev.scorecard_criteria.question_type || "rating",
          options: ev.scorecard_criteria.options
        },
        grader: ev.graded_by ? { nome: gradersMap[ev.graded_by] || null } : null
      })));
    } catch (error) {
      console.error("Erro ao carregar resultados:", error);
      toast.error("Erro ao carregar resultados do teste");
    } finally {
      setLoading(false);
    }
  }, [scorecardId]);

  useEffect(() => {
    if (open && scorecardId) {
      loadResults();
    }
  }, [open, scorecardId, loadResults]);

  // Calculate pending evaluations
  const pendingOpenText = evaluations.filter(
    ev => ev.criteria.question_type === 'open_text' && (ev.score === null || ev.score === 0)
  );
  const totalPendingWeight = pendingOpenText.reduce((sum, ev) => sum + ev.criteria.weight, 0);

  // Handle grading an open text question
  const handleGradeOpenText = async (evaluationId: string, newScore: number) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado para avaliar');
      return;
    }

    setSaving(evaluationId);
    
    // Optimistic update
    const updatedEvaluations = evaluations.map(ev => 
      ev.id === evaluationId 
        ? { 
            ...ev, 
            score: newScore, 
            graded_by: currentUserId, 
            graded_at: new Date().toISOString(),
            grader: { nome: 'Você' }
          } 
        : ev
    );
    setEvaluations(updatedEvaluations);

    try {
      // Update the evaluation
      const { error: updateError } = await supabase
        .from('scorecard_evaluations')
        .update({
          score: newScore,
          graded_by: currentUserId,
          graded_at: new Date().toISOString()
        })
        .eq('id', evaluationId);

      if (updateError) throw updateError;

      // Recalculate the match percentage using updated evaluations
      const newMatchPercentage = await recalculateMatchPercentage(updatedEvaluations);
      
      // Update local scorecard state
      setScorecard((prev: any) => prev ? { ...prev, match_percentage: newMatchPercentage } : prev);

      toast.success(`Avaliação salva: ${newScore}/5`);
      onScoreUpdated?.();
    } catch (error) {
      console.error('Error grading evaluation:', error);
      toast.error('Erro ao salvar avaliação');
      // Revert optimistic update
      loadResults();
    } finally {
      setSaving(null);
    }
  };

  // Recalculate match percentage based on all evaluations
  const recalculateMatchPercentage = async (evals: Evaluation[]): Promise<number> => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const ev of evals) {
      if (ev.score !== null && ev.score > 0) {
        totalWeightedScore += (ev.score / 5) * ev.criteria.weight;
        totalWeight += ev.criteria.weight;
      }
    }

    const matchPercentage = totalWeight > 0
      ? Math.round((totalWeightedScore / totalWeight) * 100)
      : 0;

    // Update in database
    await supabase
      .from('candidate_scorecards')
      .update({
        match_percentage: matchPercentage,
        total_score: totalWeightedScore
      })
      .eq('id', scorecardId);

    return matchPercentage;
  };

  // Calculate contribution for display
  const calculateContribution = (score: number | null, weight: number): string => {
    if (score === null || score === 0) return '—';
    const contribution = (score / 5) * weight;
    return `${contribution.toFixed(1)}%`;
  };

  function renderAnswer(evaluation: Evaluation) {
    const { criteria, score, text_answer, selected_option_index, is_correct, graded_by, graded_at, grader } = evaluation;
    const isOpenText = criteria.question_type === 'open_text';
    const isMultipleChoice = criteria.question_type === 'multiple_choice';
    const isRating = criteria.question_type === 'rating';
    const isPending = isOpenText && (score === null || score === 0);
    const isSaving = saving === evaluation.id;

    // Rating type - read only
    if (isRating) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ReadOnlyStarRating score={score || 0} />
            <span className="text-sm font-medium">{score}/5</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Contribuição: {calculateContribution(score, criteria.weight)} do score total
          </div>
        </div>
      );
    }

    // Multiple choice - auto corrected
    if (isMultipleChoice) {
      const options = criteria.options || [];
      
      return (
        <div className="space-y-2">
          {options.map((opt: any, index: number) => {
            const isSelected = index === selected_option_index;
            const isCorrectOption = opt.is_correct;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border",
                  isSelected && isCorrectOption && "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700",
                  isSelected && !isCorrectOption && "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700",
                  !isSelected && isCorrectOption && "bg-green-50/50 border-green-200 dark:bg-green-950/50 dark:border-green-800",
                  !isSelected && !isCorrectOption && "bg-muted/30"
                )}
              >
                {isSelected && isCorrectOption && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                {!isSelected && isCorrectOption && <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />}
                {!isSelected && !isCorrectOption && <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
                <span className={cn("text-sm", isSelected && "font-medium")}>
                  {opt.text}
                </span>
                {isSelected && (
                  <span className="ml-auto text-xs text-muted-foreground">Selecionado</span>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>Pontuação automática: {score}/5 ({is_correct ? 'Correto' : 'Incorreto'})</span>
            <span>Contribuição: {calculateContribution(score, criteria.weight)}</span>
          </div>
        </div>
      );
    }

    // Open text - interactive grading
    if (isOpenText) {
      return (
        <div className="space-y-3">
          {/* Candidate's answer */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <p className="text-sm whitespace-pre-wrap">
              {text_answer || <em className="text-muted-foreground">Resposta não fornecida</em>}
            </p>
          </div>

          {/* Grading section */}
          <div className={cn(
            "rounded-lg p-3 border-2",
            isPending 
              ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950" 
              : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950"
          )}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isPending ? (
                  <>
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      Avaliar resposta:
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Sua avaliação:
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <InteractiveStarRating
                  score={score}
                  onRate={(newScore) => handleGradeOpenText(evaluation.id, newScore)}
                  disabled={isSaving}
                />
                {score !== null && score > 0 && (
                  <span className="text-sm font-medium">({score}/5)</span>
                )}
              </div>
            </div>

            {/* Grader info */}
            {graded_by && graded_at && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  Avaliado por {grader?.nome || 'Recrutador'} em{' '}
                  {format(new Date(graded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            {/* Contribution preview */}
            <div className="mt-2 text-xs text-muted-foreground">
              {score !== null && score > 0 ? (
                <>Contribuição: {calculateContribution(score, criteria.weight)} do score total</>
              ) : (
                <>Se nota 5/5 → Contribuição máxima: {criteria.weight}%</>
              )}
            </div>
          </div>
        </div>
      );
    }

    return <span className="text-muted-foreground text-sm">Tipo desconhecido</span>;
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Carregando resultados...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Respostas do Teste Técnico
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            {scorecard && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{scorecard.scorecard_templates?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {scorecard.candidatos?.nome_completo}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">
                          {scorecard.match_percentage || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground">Score</p>
                      </div>
                    </div>

                    <Progress value={scorecard?.match_percentage || 0} className="h-2" />

                    {/* Pending evaluations warning */}
                    {pendingOpenText.length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-700 dark:text-yellow-300">
                            {pendingOpenText.length} pergunta{pendingOpenText.length > 1 ? 's' : ''} aberta{pendingOpenText.length > 1 ? 's' : ''} pendente{pendingOpenText.length > 1 ? 's' : ''} de avaliação
                          </p>
                          <p className="text-yellow-600 dark:text-yellow-400">
                            Peso total pendente: {totalPendingWeight}%
                          </p>
                        </div>
                      </div>
                    )}

                    {scorecard?.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Submetido em {format(new Date(scorecard.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evaluations */}
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", categoryColors[evaluation.criteria.category])}
                          >
                            {categoryLabels[evaluation.criteria.category] || evaluation.criteria.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Peso: {evaluation.criteria.weight}%
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {evaluation.criteria.question_type === 'open_text' ? 'Resposta Aberta' :
                             evaluation.criteria.question_type === 'multiple_choice' ? 'Múltipla Escolha' :
                             'Avaliação'}
                          </Badge>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

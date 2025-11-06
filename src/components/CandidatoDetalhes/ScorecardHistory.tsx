import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, User, Calendar, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScorecardHistoryProps {
  candidateId: string;
}

interface Scorecard {
  id: string;
  template_name: string;
  evaluator_name: string;
  recommendation: string;
  comments: string | null;
  total_score: number;
  match_percentage: number;
  created_at: string;
  vaga_titulo?: string | null;
  evaluations: Array<{
    criteria_name: string;
    criteria_category: string;
    criteria_weight: number;
    score: number;
    notes: string | null;
  }>;
}

const categoryLabels: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experiencia: "Experiência",
  fit_cultural: "Fit Cultural",
  outros: "Outros",
};

const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200",
};

const recommendationConfig: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Yes", color: "bg-green-600 text-white" },
  yes: { label: "Yes", color: "bg-green-400 text-white" },
  maybe: { label: "Maybe", color: "bg-yellow-500 text-white" },
  no: { label: "No", color: "bg-red-500 text-white" },
};

function getInitials(name: string | undefined): string {
  if (!name || name.trim().length === 0) {
    return "??";
  }
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export function ScorecardHistory({ candidateId }: ScorecardHistoryProps) {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScorecards();
  }, [candidateId]);

  async function loadScorecards() {
    try {
      setLoading(true);

      // Load scorecards with related data
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from("candidate_scorecards")
        .select(`
          *,
          scorecard_templates!candidate_scorecards_template_id_fkey(name),
          vagas(titulo)
        `)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (scorecardsError) throw scorecardsError;

      // Get evaluator names separately
      const userIds = [...new Set((scorecardsData || []).map(s => s.evaluator_id))];
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u.name]) || []);

      // Load evaluations for each scorecard
      const scorecardsWithEvaluations = await Promise.all(
        (scorecardsData || []).map(async (scorecard) => {
          const { data: evaluationsData, error: evaluationsError } = await supabase
            .from("scorecard_evaluations")
            .select(`
              score,
              notes,
              scorecard_criteria!inner(
                name,
                category,
                weight,
                display_order
              )
            `)
            .eq("scorecard_id", scorecard.id);

          if (evaluationsError) {
            console.error("Error loading evaluations:", evaluationsError);
            return {
              ...scorecard,
              evaluations: [],
            };
          }

          // Ordenar manualmente após carregar
          const sortedEvaluations = (evaluationsData || []).sort((a: any, b: any) => {
            return (a.scorecard_criteria?.display_order || 0) - (b.scorecard_criteria?.display_order || 0);
          });

          return {
            id: scorecard.id,
            template_name: scorecard.scorecard_templates?.name || "Template",
            evaluator_name: usersMap.get(scorecard.evaluator_id) || "Avaliador",
            recommendation: scorecard.recommendation,
            comments: scorecard.comments,
            total_score: scorecard.total_score,
            match_percentage: scorecard.match_percentage,
            created_at: scorecard.created_at,
            vaga_titulo: scorecard.vagas?.titulo || null,
            evaluations: sortedEvaluations.map((ev: any) => ({
              criteria_name: ev.scorecard_criteria.name,
              criteria_category: ev.scorecard_criteria.category,
              criteria_weight: ev.scorecard_criteria.weight,
              score: ev.score,
              notes: ev.notes,
            })),
          };
        })
      );

      setScorecards(scorecardsWithEvaluations as Scorecard[]);
    } catch (error: any) {
      console.error("Erro ao carregar histórico de scorecards:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (scorecards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Avaliações</CardTitle>
          <CardDescription>Scorecards preenchidos para este candidato</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Nenhum scorecard preenchido ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate average score
  const averageScore =
    scorecards.reduce((sum, s) => sum + s.match_percentage, 0) / scorecards.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Histórico de Avaliações</CardTitle>
            <CardDescription className="text-base">
              <span className="font-semibold">{scorecards.length}</span> {scorecards.length === 1 ? "avaliação" : "avaliações"} recebidas
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{Math.round(averageScore)}%</div>
            <p className="text-sm font-medium text-muted-foreground">Match médio</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scorecards.map((scorecard) => {
            const recConfig = recommendationConfig[scorecard.recommendation];

            return (
              <div
                key={scorecard.id}
                className="border rounded-lg p-6 space-y-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12 bg-primary/10 shrink-0">
                      <AvatarFallback className="text-sm font-bold">
                        {getInitials(scorecard.evaluator_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="font-bold text-lg">
                        {scorecard.template_name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{scorecard.evaluator_name}</span>
                      </div>
                      {scorecard.vaga_titulo && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-sm font-medium">
                            {scorecard.vaga_titulo}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-2">
                    <div className="text-3xl font-bold">
                      {scorecard.match_percentage}%
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {format(new Date(scorecard.created_at), "dd MMM yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendation Badge */}
                <div className="pt-2">
                  <Badge className={cn("text-sm font-semibold px-4 py-1.5", recConfig.color)}>
                    {recConfig.label}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3 pt-2">
                  <Progress value={scorecard.match_percentage} className="h-2.5" />
                </div>

                {/* Comments */}
                {scorecard.comments && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-bold">Comentários:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {scorecard.comments}
                    </p>
                  </div>
                )}

                {/* Evaluations Summary */}
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-bold">Critérios Avaliados:</p>
                  <div className="space-y-3">
                    {scorecard.evaluations.slice(0, 3).map((evaluation, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span className="text-muted-foreground font-medium">{evaluation.criteria_name}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-4 w-4",
                                star <= evaluation.score
                                  ? "fill-[#FFCD00] text-[#FFCD00]"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {scorecard.evaluations.length > 3 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{scorecard.evaluations.length - 3} critérios adicionais
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

function getInitials(name: string): string {
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
                weight
              )
            `)
            .eq("scorecard_id", scorecard.id)
            .order("scorecard_criteria(display_order)");

          if (evaluationsError) {
            console.error("Error loading evaluations:", evaluationsError);
            return {
              ...scorecard,
              evaluations: [],
            };
          }

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
            evaluations: evaluationsData.map((ev: any) => ({
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
            <CardTitle>Histórico de Avaliações</CardTitle>
            <CardDescription>
              {scorecards.length} {scorecards.length === 1 ? "avaliação" : "avaliações"} recebidas
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(averageScore)}%</div>
            <p className="text-xs text-muted-foreground">Match médio</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-4">
          {scorecards.map((scorecard) => {
            const recConfig = recommendationConfig[scorecard.recommendation];

            return (
              <AccordionItem
                key={scorecard.id}
                value={scorecard.id}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-start justify-between w-full gap-4 pr-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10 bg-primary/10">
                        <AvatarFallback className="text-xs font-bold">
                          {getInitials(scorecard.evaluator_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">
                          {scorecard.template_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{scorecard.evaluator_name}</span>
                        </div>
                        {scorecard.vaga_titulo && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {scorecard.vaga_titulo}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <Badge className={cn("text-xs", recConfig.color)}>
                        {recConfig.label}
                      </Badge>

                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {scorecard.match_percentage}%
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(scorecard.created_at), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Match Score</span>
                        <span className="font-semibold">
                          {scorecard.match_percentage}%
                        </span>
                      </div>
                      <Progress value={scorecard.match_percentage} className="h-2" />
                    </div>

                    {/* Comments */}
                    {scorecard.comments && (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Comentários Gerais:</p>
                        <p className="text-sm text-muted-foreground">
                          {scorecard.comments}
                        </p>
                      </div>
                    )}

                    {/* Evaluations */}
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Detalhes por Critério:</p>
                      {scorecard.evaluations.map((evaluation, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    categoryColors[evaluation.criteria_category]
                                  )}
                                >
                                  {categoryLabels[evaluation.criteria_category]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Peso: {evaluation.criteria_weight}%
                                </span>
                              </div>
                              <p className="font-medium text-sm">
                                {evaluation.criteria_name}
                              </p>
                            </div>

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

                          {evaluation.notes && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {evaluation.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
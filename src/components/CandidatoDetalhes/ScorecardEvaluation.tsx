import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
interface ScorecardTemplate {
  id: string;
  name: string;
  description: string | null;
}
interface Criterion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weight: number;
  display_order: number;
}
interface Evaluation {
  criteria_id: string;
  score: number;
  notes: string;
}
interface ScorecardEvaluationProps {
  candidateId: string;
  candidateName: string;
  vagaId?: string | null;
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
const recommendations = [{
  value: "strong_yes",
  label: "Fortemente Recomendado",
  color: "bg-green-600"
}, {
  value: "yes",
  label: "Recomendado",
  color: "bg-green-400"
}, {
  value: "maybe",
  label: "Talvez",
  color: "bg-yellow-500"
}, {
  value: "no",
  label: "Não Recomendado",
  color: "bg-red-500"
}];
export function ScorecardEvaluation({
  candidateId,
  candidateName,
  vagaId
}: ScorecardEvaluationProps) {
  const [templates, setTemplates] = useState<ScorecardTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [recommendation, setRecommendation] = useState<string>("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadTemplates();
  }, []);
  useEffect(() => {
    if (selectedTemplateId) {
      loadCriteria(selectedTemplateId);
    }
  }, [selectedTemplateId]);
  async function loadTemplates() {
    try {
      const {
        data,
        error
      } = await supabase.from("scorecard_templates").select("id, name, description").eq("active", true).order("name");
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar templates");
    }
  }
  async function loadCriteria(templateId: string) {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from("scorecard_criteria").select("*").eq("template_id", templateId).order("display_order");
      if (error) throw error;
      setCriteria(data || []);

      // Initialize evaluations
      const initialEvaluations = (data || []).map(c => ({
        criteria_id: c.id,
        score: 0,
        notes: ""
      }));
      setEvaluations(initialEvaluations);
    } catch (error: any) {
      console.error("Erro ao carregar critérios:", error);
      toast.error("Erro ao carregar critérios");
    } finally {
      setLoading(false);
    }
  }
  function updateEvaluation(criteriaId: string, field: "score" | "notes", value: number | string) {
    setEvaluations(prev => prev.map(ev => ev.criteria_id === criteriaId ? {
      ...ev,
      [field]: value
    } : ev));
  }
  function calculateScore() {
    if (criteria.length === 0 || evaluations.length === 0) return {
      total: 0,
      percentage: 0
    };
    let totalWeightedScore = 0;
    let totalWeight = 0;
    criteria.forEach(criterion => {
      const evaluation = evaluations.find(ev => ev.criteria_id === criterion.id);
      if (evaluation && evaluation.score > 0) {
        totalWeightedScore += evaluation.score / 5 * criterion.weight;
        totalWeight += criterion.weight;
      }
    });
    const percentage = totalWeight > 0 ? totalWeightedScore / totalWeight * 100 : 0;
    return {
      total: parseFloat(totalWeightedScore.toFixed(2)),
      percentage: Math.round(percentage)
    };
  }
  async function handleSave() {
    if (!selectedTemplateId) {
      toast.error("Selecione um template");
      return;
    }
    if (!recommendation) {
      toast.error("Selecione uma recomendação");
      return;
    }
    const incompleteEvaluations = evaluations.filter(ev => ev.score === 0);
    if (incompleteEvaluations.length > 0) {
      toast.error("Preencha a pontuação de todos os critérios");
      return;
    }
    try {
      setSaving(true);
      const {
        total,
        percentage
      } = calculateScore();
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create scorecard
      const {
        data: scorecard,
        error: scorecardError
      } = await supabase.from("candidate_scorecards").insert({
        candidate_id: candidateId,
        template_id: selectedTemplateId,
        evaluator_id: user.id,
        vaga_id: vagaId,
        recommendation: recommendation as any,
        comments: comments,
        total_score: total,
        match_percentage: percentage
      }).select().single();
      if (scorecardError) throw scorecardError;

      // Insert evaluations
      const evaluationsToInsert = evaluations.map(ev => ({
        scorecard_id: scorecard.id,
        criteria_id: ev.criteria_id,
        score: ev.score,
        notes: ev.notes
      }));
      const {
        error: evaluationsError
      } = await supabase.from("scorecard_evaluations").insert(evaluationsToInsert);
      if (evaluationsError) throw evaluationsError;
      toast.success("Avaliação salva com sucesso!");

      // Reset form
      setSelectedTemplateId("");
      setCriteria([]);
      setEvaluations([]);
      setRecommendation("");
      setComments("");
    } catch (error: any) {
      console.error("Erro ao salvar avaliação:", error);
      toast.error("Erro ao salvar avaliação");
    } finally {
      setSaving(false);
    }
  }
  const {
    total,
    percentage
  } = calculateScore();
  const allScoresSet = evaluations.length > 0 && evaluations.every(ev => ev.score > 0);
  return <Card className="border border-gray-300 shadow-md">
      <CardHeader className="border-gray-300">
        <CardTitle className="text-xl font-bold"> Scorecards</CardTitle>
        <CardDescription className="text-base">
          Avalie <span className="font-semibold">{candidateName}</span> de forma estruturada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Template de Avaliação</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => <SelectItem key={template.id} value={template.id}>
                  <div>
                    <div className="font-semibold text-base">{template.name}</div>
                    {template.description && <div className="text-sm text-muted-foreground">
                        {template.description}
                      </div>}
                  </div>
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading && <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>}

        {/* Criteria Evaluation */}
        {!loading && criteria.length > 0 && <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Critérios de Avaliação</h3>
                {allScoresSet && <Badge variant="default" className="gap-1 text-sm">
                    <Check className="h-4 w-4" />
                    Completo
                  </Badge>}
              </div>

              {criteria.map(criterion => {
            const evaluation = evaluations.find(ev => ev.criteria_id === criterion.id);
            if (!evaluation) return null;
            return <Card key={criterion.id} className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-sm font-medium", categoryColors[criterion.category])}>
                              {categoryLabels[criterion.category]}
                            </Badge>
                            <span className="text-sm font-medium text-muted-foreground">
                              Peso: <span className="font-bold">{criterion.weight}%</span>
                            </span>
                          </div>
                          <h4 className="text-base font-bold">{criterion.name}</h4>
                          {criterion.description && <p className="text-muted-foreground mt-1 text-sm font-semibold">
                              {criterion.description}
                            </p>}
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Pontuação</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(score => <TooltipProvider key={score}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant={evaluation.score >= score ? "default" : "outline"} size="sm" onClick={() => updateEvaluation(criterion.id, "score", score)} className={cn("flex-1", evaluation.score >= score && "bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D]")}>
                                    <Star className={cn("h-4 w-4", evaluation.score >= score && "fill-current")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {score === 1 && "Não atende"}
                                    {score === 2 && "Atende parcialmente"}
                                    {score === 3 && "Atende"}
                                    {score === 4 && "Supera"}
                                    {score === 5 && "Excede"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>)}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Observações (opcional)</Label>
                        <Textarea value={evaluation.notes} onChange={e => updateEvaluation(criterion.id, "notes", e.target.value)} placeholder="Adicione comentários sobre esta avaliação" rows={2} className="text-sm" />
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div>

            {/* Score Summary */}
            {allScoresSet && <Card className="border-2 border-[#FFCD00] bg-[#FFFDF6]">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold">Match Score</span>
                        <span className="text-3xl font-bold">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Score ponderado: <span className="font-semibold">{total} / 100</span>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Recommendation */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Recomendação Final *</Label>
              <Select value={recommendation} onValueChange={setRecommendation}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua recomendação" />
                </SelectTrigger>
                <SelectContent>
                  {recommendations.map(rec => <SelectItem key={rec.value} value={rec.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", rec.color)} />
                        <span>{rec.label}</span>
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Comentários Gerais</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Adicione observações gerais sobre o candidato" rows={4} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving || !allScoresSet || !recommendation} className="flex-1 font-semibold">
                {saving ? "Salvando..." : "Salvar Avaliação"}
              </Button>
            </div>

            {!allScoresSet && <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800 font-semibold">
                  Preencha a pontuação de todos os critérios antes de salvar
                </p>
              </div>}
          </>}
      </CardContent>
    </Card>;
}
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Sparkles, Download, User, Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CompareCandidatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaId: string;
  vagaTitulo: string;
}

type CandidateData = {
  id: string;
  name: string;
  fullName: string;
  totalScore: number;
  evaluationsCount: number;
  criteriaAverages: Array<{
    name: string;
    category: string;
    average: number;
  }>;
  lastEvaluationDate: string;
  recommendations: string[];
  evaluators: string[];
  scorecards: Array<{
    id: string;
    templateName: string;
    evaluator: string;
    score: number;
    recommendation: string;
    comments: string | null;
    date: string;
  }>;
};

const recommendationLabels: Record<string, string> = {
  strong_yes: "Fortemente Recomendado",
  yes: "Recomendado",
  maybe: "Talvez",
  no: "Não Recomendado",
};

const recommendationColors: Record<string, string> = {
  strong_yes: "bg-green-600 text-white",
  yes: "bg-green-400 text-white",
  maybe: "bg-yellow-500 text-white",
  no: "bg-red-500 text-white",
};

export function CompareCandidatesModal({
  open,
  onOpenChange,
  vagaId,
  vagaTitulo,
}: CompareCandidatesModalProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const [sortBy, setSortBy] = useState<"score_desc" | "evaluations_desc">("score_desc");
  const [showTopN, setShowTopN] = useState<number>(10);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("compare-candidates", {
        body: { vagaId, anonymize },
      });

      if (error) throw error;

      setCandidates(data.candidates || []);
      setStats(data.stats || null);
      
      if (data.candidates.length === 0) {
        toast({
          title: "Nenhum scorecard encontrado",
          description: "Não há avaliações de scorecards para candidatos desta vaga.",
        });
      }
    } catch (error: any) {
      console.error("Error loading comparison data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (candidates.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há candidatos para gerar resumo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGeneratingAI(true);
      
      const { data, error } = await supabase.functions.invoke("generate-comparison-summary", {
        body: {
          vagaTitle: vagaTitulo,
          candidates: candidates.slice(0, 5), // Top 5
          anonymize,
        },
      });

      if (error) throw error;

      setAiSummary(data.summary || "");
      
      toast({
        title: "Resumo gerado",
        description: "Resumo executivo gerado com sucesso pela IA.",
      });
    } catch (error: any) {
      console.error("Error generating AI summary:", error);
      toast({
        title: "Erro ao gerar resumo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de exportação para PDF estará disponível em breve.",
    });
  };

  const getSortedCandidates = () => {
    let sorted = [...candidates];
    
    if (sortBy === "score_desc") {
      sorted.sort((a, b) => b.totalScore - a.totalScore);
    } else if (sortBy === "evaluations_desc") {
      sorted.sort((a, b) => b.evaluationsCount - a.evaluationsCount);
    }
    
    return sorted.slice(0, showTopN);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      loadData();
    } else {
      // Reset ao fechar
      setCandidates([]);
      setStats(null);
      setAiSummary("");
    }
    onOpenChange(newOpen);
  };

  const sortedCandidates = getSortedCandidates();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Comparar Candidatos - {vagaTitulo}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Análise comparativa baseada em scorecards preenchidos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={generateAISummary}
                disabled={generatingAI || loading || candidates.length === 0}
                variant="outline"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAI ? "Gerando..." : "Resumo IA"}
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={loading || candidates.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Estatísticas Gerais */}
              {stats && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total de Candidatos</p>
                    <p className="text-2xl font-bold">{stats.totalCandidates}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Score Médio</p>
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Melhor Score</p>
                    <p className="text-2xl font-bold text-green-600">{stats.topScore}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Menor Score</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.lowScore}%</p>
                  </div>
                </div>
              )}

              {/* Resumo IA */}
              {aiSummary && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Resumo Executivo (IA)</h3>
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                </div>
              )}

              {/* Filtros */}
              <div className="flex items-center justify-between gap-4 bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="anonymize"
                      checked={anonymize}
                      onCheckedChange={(checked) => {
                        setAnonymize(checked as boolean);
                        if (open) loadData();
                      }}
                    />
                    <label htmlFor="anonymize" className="text-sm font-medium">
                      Remover nomes
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Mostrar:</label>
                    <Select
                      value={showTopN.toString()}
                      onValueChange={(v) => setShowTopN(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="20">Top 20</SelectItem>
                        <SelectItem value="999">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Ordenar por:</label>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score_desc">Score (maior)</SelectItem>
                      <SelectItem value="evaluations_desc">Avaliações (mais)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Candidatos */}
              {sortedCandidates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum candidato com scorecard encontrado para esta vaga.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-4 text-left font-semibold">#</th>
                        <th className="p-4 text-left font-semibold">Candidato</th>
                        <th className="p-4 text-center font-semibold">Score Total</th>
                        <th className="p-4 text-left font-semibold">Top Critérios</th>
                        <th className="p-4 text-center font-semibold">Avaliações</th>
                        <th className="p-4 text-center font-semibold">Última Avaliação</th>
                        <th className="p-4 text-left font-semibold">Recomendações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCandidates.map((candidate, index) => (
                        <tr key={candidate.id} className="border-t hover:bg-muted/30">
                          <td className="p-4 font-bold text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-semibold">{candidate.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {candidate.evaluators.length} avaliador(es)
                                </p>
                              </div>
                            </div>
                            {candidate.evaluationsCount === 1 && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                ⚠️ Baixa confiabilidade
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-2xl font-bold text-primary">
                                {candidate.totalScore}%
                              </span>
                              <Progress value={candidate.totalScore} className="w-20 h-2" />
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {candidate.criteriaAverages.slice(0, 3).map((criteria, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{criteria.name}:</span>
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, starIdx) => (
                                      <Star
                                        key={starIdx}
                                        className={cn(
                                          "h-3 w-3",
                                          starIdx < Math.round(criteria.average)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="secondary">
                              {candidate.evaluationsCount} avaliação(ões)
                            </Badge>
                          </td>
                          <td className="p-4 text-center text-sm text-muted-foreground">
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(candidate.lastEvaluationDate), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(candidate.recommendations)].map((rec, i) => (
                                <Badge
                                  key={i}
                                  className={cn(
                                    "text-xs",
                                    recommendationColors[rec] || "bg-gray-500 text-white"
                                  )}
                                >
                                  {recommendationLabels[rec] || rec}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

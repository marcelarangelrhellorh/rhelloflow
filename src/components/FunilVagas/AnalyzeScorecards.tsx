import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileDown, Copy, Sparkles, AlertCircle, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
interface AnalyzeScorecardProps {
  vagaId: string;
  vagaTitulo: string;
}
export function AnalyzeScorecards({
  vagaId,
  vagaTitulo
}: AnalyzeScorecardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);
  const [aggregateData, setAggregateData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const handleAnalyze = async () => {
    setLoading(true);
    setAggregateData(null);
    setAnalysis(null);
    try {
      // Passo 1: Agregar dados dos scorecards
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }
      const aggregateUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aggregate-scorecards/${vagaId}`;
      const aggregateResponse = await fetch(aggregateUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!aggregateResponse.ok) {
        const errorData = await aggregateResponse.json();
        throw new Error(errorData.message || 'Erro ao agregar scorecards');
      }
      const aggregateResult = await aggregateResponse.json();
      if (!aggregateResult.success || aggregateResult.candidates.length === 0) {
        toast({
          title: "Nenhum scorecard encontrado",
          description: "Esta vaga não possui scorecards completos para análise.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      setAggregateData(aggregateResult);

      // Passo 2: Chamar IA para análise
      const analyzeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scorecards-ai`;
      const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vaga_id: vagaId,
          aggregated_data: aggregateResult,
          anonymize,
          include_comments: includeComments
        })
      });
      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Erro ao analisar com IA');
      }
      const analyzeResult = await analyzeResponse.json();
      setAnalysis(analyzeResult.ia_summary);
      toast({
        title: "Análise concluída",
        description: `${aggregateResult.candidates.length} candidatos analisados com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro na análise:', error);
      toast({
        title: "Erro na análise",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCopy = () => {
    if (!analysis || !aggregateData) return;
    let text = `ANÁLISE DE SCORECARDS - ${vagaTitulo}\n`;
    text += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `📊 RESUMO EXECUTIVO\n`;
    text += `${analysis.executive_summary}\n\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `🏆 RANKING\n`;
    analysis.ranking.forEach((item: any) => {
      text += `${item.rank}º - ${item.candidate_id} (${item.total_score}%)\n`;
      text += `   ${item.note}\n\n`;
    });
    text += `═══════════════════════════════════════\n\n`;
    text += `💡 INSIGHTS\n`;
    analysis.insights.forEach((insight: string) => {
      text += `• ${insight}\n`;
    });
    text += `\n⚠️ RISCOS\n`;
    analysis.risks.forEach((risk: string) => {
      text += `• ${risk}\n`;
    });
    text += `\n✅ RECOMENDAÇÕES\n`;
    analysis.recommendations.forEach((rec: string) => {
      text += `• ${rec}\n`;
    });
    text += `\n📝 NOTAS DE CONFIABILIDADE\n`;
    analysis.confidence_notes.forEach((note: string) => {
      text += `• ${note}\n`;
    });
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Resumo copiado para a área de transferência."
    });
  };
  const handleDownloadPDF = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de download em PDF estará disponível em breve."
    });
  };
  return <>
      <Button onClick={() => setOpen(true)} variant="default" className="gap-2 bg-[faec3e] text-[faec3e] font-semibold my-[8px] bg-[#faec3e] py-0">
        <Sparkles className="h-4 w-4" />
        Analisar scorecards (IA)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análise IA - Scorecards
            </DialogTitle>
            <DialogDescription>
              {vagaTitulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Opções */}
            {!aggregateData && <div className="flex items-center gap-6 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox id="anon" checked={anonymize} onCheckedChange={checked => setAnonymize(checked === true)} />
                  <Label htmlFor="anon" className="cursor-pointer">
                    Remover nomes (anonimizar)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="comments" checked={includeComments} onCheckedChange={checked => setIncludeComments(checked === true)} />
                  <Label htmlFor="comments" className="cursor-pointer">
                    Incluir comentários
                  </Label>
                </div>
              </div>}

            {/* Loading */}
            {loading && <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 animate-pulse text-primary mb-4" />
                <p>Agregando dados e chamando IA...</p>
                <p className="text-sm">Isso pode levar alguns segundos</p>
              </div>}

            {/* Results */}
            {!loading && aggregateData && analysis && <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <FileDown className="h-4 w-4" />
                      Resumo Executivo
                    </h3>
                    <p className="text-sm">{analysis.executive_summary}</p>
                  </div>

                  {/* Ranking Table */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Ranking de Candidatos
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium">Rank</th>
                            <th className="text-left p-3 text-sm font-medium">Candidato</th>
                            <th className="text-left p-3 text-sm font-medium">Score</th>
                            <th className="text-left p-3 text-sm font-medium">Avaliadores</th>
                            <th className="text-left p-3 text-sm font-medium">Justificativa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.ranking.map((item: any, index: number) => {
                        const candidate = aggregateData.candidates.find((c: any) => c.candidate_id === item.candidate_id || `Candidato ${index + 1}` === item.candidate_id || `candidate_${index + 1}` === item.candidate_id);
                        return <tr key={item.rank} className="border-t">
                                <td className="p-3">
                                  <Badge variant={item.rank === 1 ? "default" : "secondary"}>
                                    {item.rank}º
                                  </Badge>
                                </td>
                                <td className="p-3 font-medium">{item.candidate_id}</td>
                                <td className="p-3">
                                  <span className="font-bold text-lg">{item.total_score}%</span>
                                </td>
                                <td className="p-3">
                                  <Badge variant={candidate?.low_confidence ? "destructive" : "outline"}>
                                    {candidate?.evaluators_count || 0}
                                    {candidate?.low_confidence && " ⚠️"}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">{item.note}</td>
                              </tr>;
                      })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  {/* Insights */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Insights
                    </h3>
                    <ul className="space-y-2">
                      {analysis.insights.map((insight: string, i: number) => <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary">•</span>
                          <span>{insight}</span>
                        </li>)}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      Riscos
                    </h3>
                    <ul className="space-y-2">
                      {analysis.risks.map((risk: string, i: number) => <li key={i} className="flex gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <span>⚠️</span>
                          <span>{risk}</span>
                        </li>)}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <AlertCircle className="h-4 w-4" />
                      Recomendações
                    </h3>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec: string, i: number) => <li key={i} className="flex gap-2 text-sm">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          <span>{rec}</span>
                        </li>)}
                    </ul>
                  </div>

                  {/* Confidence Notes */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2 text-sm">Notas de Confiabilidade</h3>
                    {analysis.confidence_notes.map((note: string, i: number) => <p key={i} className="text-sm text-muted-foreground">{note}</p>)}
                  </div>
                </div>
              </ScrollArea>}

            {/* Actions */}
            {!loading && aggregateData && analysis && <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleDownloadPDF} variant="default" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Button>
                <Button onClick={handleCopy} variant="outline" className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar resumo
                </Button>
              </div>}

            {/* Initial State */}
            {!loading && !aggregateData && <div className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-6">
                  Configure as opções acima e clique em "Iniciar Análise"
                </p>
                <Button onClick={handleAnalyze} size="lg" className="gap-2">
                  <Sparkles className="h-5 w-5" />
                  Iniciar Análise
                </Button>
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </>;
}
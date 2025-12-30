import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Copy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Eye,
  FileText
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TechnicalTestResultModal } from "./TechnicalTestResultModal";

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface TechnicalTest {
  id: string;
  template_id: string;
  template_name: string;
  external_token: string;
  expires_at: string | null;
  submitted_at: string | null;
  created_at: string;
  match_percentage: number | null;
  total_score: number | null;
}

interface TechnicalTestSectionProps {
  candidateId: string;
  candidateName: string;
  vagaId?: string | null;
}

const expirationOptions = [
  { value: "3", label: "3 dias" },
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
];

export function TechnicalTestSection({
  candidateId,
  candidateName,
  vagaId
}: TechnicalTestSectionProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState<string>("7");
  const [tests, setTests] = useState<TechnicalTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadTests();
  }, [candidateId]);

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from("scorecard_templates")
        .select("id, name, description")
        .eq("active", true)
        .eq("type", "teste_tecnico")
        .order("name");
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar templates:", error);
    }
  }

  async function loadTests() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidate_scorecards")
        .select(`
          id,
          template_id,
          external_token,
          expires_at,
          submitted_at,
          created_at,
          match_percentage,
          total_score,
          scorecard_templates!candidate_scorecards_template_id_fkey(name)
        `)
        .eq("candidate_id", candidateId)
        .eq("source", "externo")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setTests((data || []).map((t: any) => ({
        id: t.id,
        template_id: t.template_id,
        template_name: t.scorecard_templates?.name || "Template",
        external_token: t.external_token,
        expires_at: t.expires_at,
        submitted_at: t.submitted_at,
        created_at: t.created_at,
        match_percentage: t.match_percentage,
        total_score: t.total_score
      })));
    } catch (error: any) {
      console.error("Erro ao carregar testes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLink() {
    if (!selectedTemplateId) {
      toast.error("Selecione um template");
      return;
    }

    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke("generate-technical-test-link", {
        body: {
          candidateId,
          templateId: selectedTemplateId,
          vagaId,
          expirationDays: parseInt(expirationDays)
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Link do teste gerado com sucesso!");
      setSelectedTemplateId("");
      loadTests();

      // Copy to clipboard
      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success("Link copiado para a área de transferência!");
      }
    } catch (error: any) {
      console.error("Erro ao gerar link:", error);
      toast.error(error.message || "Erro ao gerar link do teste");
    } finally {
      setGenerating(false);
    }
  }

  function getTestStatus(test: TechnicalTest): { label: string; color: string; icon: React.ReactNode } {
    if (test.submitted_at) {
      return {
        label: "Respondido",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle2 className="h-4 w-4" />
      };
    }
    
    if (test.expires_at && isPast(new Date(test.expires_at))) {
      return {
        label: "Expirado",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: <AlertCircle className="h-4 w-4" />
      };
    }
    
    return {
      label: "Aguardando",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: <Clock className="h-4 w-4" />
    };
  }

  function getTestUrl(token: string): string {
    return `${window.location.origin}/teste-tecnico/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(getTestUrl(token));
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  }

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardHeader className="border-gray-300">
        <CardTitle className="font-bold text-base">Teste Técnico</CardTitle>
        <CardDescription className="text-base">
          Envie testes técnicos para <span className="font-semibold">{candidateName}</span> responder
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Link Form */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          <h4 className="font-semibold text-sm">Enviar Novo Teste</h4>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template do Teste</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um teste técnico" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum template de teste técnico disponível.
                      <br />
                      Crie um em Avaliações → Novo Template.
                    </div>
                  ) : (
                    templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-muted-foreground">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Prazo para Responder</Label>
              <Select value={expirationDays} onValueChange={setExpirationDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expirationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateLink} 
            disabled={generating || !selectedTemplateId}
            className="w-full md:w-auto"
          >
            {generating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Gerar Link do Teste
              </>
            )}
          </Button>
        </div>

        {/* Tests List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Testes Enviados</h4>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Nenhum teste enviado ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(test => {
                const status = getTestStatus(test);
                return (
                  <div 
                    key={test.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{test.template_name}</span>
                        <Badge variant="outline" className={cn("text-xs", status.color)}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>
                          Enviado: {format(new Date(test.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {test.expires_at && !test.submitted_at && (
                          <span>
                            • Expira {formatDistanceToNow(new Date(test.expires_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        )}
                        {test.submitted_at && (
                          <span>
                            • Respondido em {format(new Date(test.submitted_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {/* Score if submitted */}
                      {test.submitted_at && test.match_percentage !== null && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Score:</span>
                            <span className="text-lg font-bold text-primary">{test.match_percentage}%</span>
                          </div>
                          <Progress value={test.match_percentage} className="h-2 w-32 mt-1" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {test.submitted_at ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTestId(test.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Respostas
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyLink(test.external_token)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copiar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(getTestUrl(test.external_token), "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Result Modal */}
      {selectedTestId && (
        <TechnicalTestResultModal 
          scorecardId={selectedTestId}
          open={!!selectedTestId}
          onOpenChange={(open) => !open && setSelectedTestId(null)}
        />
      )}
    </Card>
  );
}

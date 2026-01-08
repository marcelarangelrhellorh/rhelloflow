import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Save, RefreshCw, Scale, FileText, Target, Lightbulb } from "lucide-react";
import { RolesMultiSelect } from "@/components/ComparadorCargos/RolesMultiSelect";
import { ComparisonResult } from "@/components/ComparadorCargos/ComparisonResult";
import { generateComparisonPdf } from "@/components/ComparadorCargos/ComparisonPdfExport";

interface ComparisonResponse {
  summary: string;
  table_markdown: string;
  detailed_justification: string;
  recommended_role: string;
  suggested_job_title: string;
  short_briefing: string[];
  selected_roles: Array<{
    role_id: string;
    title_pt: string;
    category: string;
    seniority_levels: string[];
    demand_trend: string;
  }>;
}

const defaultRequirements = [
  { id: "leadership", label: "Liderança de equipe", weight: 3 },
  { id: "execution", label: "Execução contínua", weight: 3 },
  { id: "project_delivery", label: "Entrega por projeto", weight: 3 },
  { id: "agility", label: "Agilidade / Adaptação", weight: 3 },
  { id: "seniority", label: "Senioridade técnica", weight: 3 },
  { id: "client_facing", label: "Contato com cliente", weight: 3 },
  { id: "strategic_vision", label: "Visão estratégica", weight: 3 },
  { id: "team_management", label: "Gestão de equipe grande", weight: 3 },
];

export default function ComparadorCargos() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<Record<string, number>>(
    defaultRequirements.reduce((acc, req) => ({ ...acc, [req.id]: req.weight }), {})
  );
  const [clientContext, setClientContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);

  const handleRequirementChange = (id: string, value: number[]) => {
    setRequirements(prev => ({ ...prev, [id]: value[0] }));
  };

  const handleCompare = async (forceRefresh = false) => {
    if (selectedRoles.length < 2) {
      toast.error("Selecione pelo menos 2 cargos para comparar");
      return;
    }
    if (selectedRoles.length > 5) {
      toast.error("Selecione no máximo 5 cargos");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('compare-roles', {
        body: {
          roleIds: selectedRoles,
          requirements,
          clientContext,
          forceRefresh
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success("Comparação gerada com sucesso!");
    } catch (error: any) {
      console.error("Error comparing roles:", error);
      toast.error(error.message || "Erro ao gerar comparação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.functions.invoke('compare-roles', {
        body: {
          roleIds: selectedRoles,
          requirements,
          clientContext,
          action: 'save'
        }
      });

      if (error) throw error;
      toast.success("Pesquisa salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving comparison:", error);
      toast.error("Erro ao salvar pesquisa");
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateComparisonPdf(result, requirements, clientContext);
    toast.success("PDF gerado com sucesso!");
  };

  const handleClear = () => {
    setSelectedRoles([]);
    setRequirements(defaultRequirements.reduce((acc, req) => ({ ...acc, [req.id]: req.weight }), {}));
    setClientContext("");
    setResult(null);
  };

  useEffect(() => {
    document.title = "Comparador de Cargos | rhello flow";
  }, []);

  return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Comparador de Cargos</h1>
            </div>
            <p className="text-muted-foreground">
              Selecione cargos e defina prioridades para receber uma análise comparativa com recomendação
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-6">
              {/* Role Selection */}
              <Card className="border-gray-300 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Selecione os Cargos (2-5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RolesMultiSelect
                    value={selectedRoles}
                    onChange={setSelectedRoles}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedRoles.length} de 5 cargos selecionados
                  </p>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="border-gray-300 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Prioridades do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {defaultRequirements.map((req) => (
                    <div key={req.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">{req.label}</Label>
                        <span className="text-sm font-medium text-primary">
                          {requirements[req.id]}/5
                        </span>
                      </div>
                      <Slider
                        value={[requirements[req.id]]}
                        onValueChange={(value) => handleRequirementChange(req.id, value)}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Context */}
              <Card className="border-gray-300 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contexto do Cliente (opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Descreva o contexto da empresa, tamanho do time, momento do negócio, etc."
                    value={clientContext}
                    onChange={(e) => setClientContext(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleCompare(false)}
                  disabled={isLoading || selectedRoles.length < 2}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4 mr-2" />
                      Comparar Cargos
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Limpar
                </Button>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {result ? (
                <>
                  <ComparisonResult result={result} />
                  
                  {/* Result Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleSave} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Pesquisa
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="ghost" onClick={() => handleCompare(true)} title="Gerar nova análise">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="border-gray-300 shadow-md h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Scale className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Selecione os cargos e clique em "Comparar"</p>
                    <p className="text-sm">O resultado da análise aparecerá aqui</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

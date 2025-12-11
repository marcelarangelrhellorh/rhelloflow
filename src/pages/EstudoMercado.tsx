import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileDown, CheckCircle, XCircle, Lightbulb, Info, Database, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import haysData from "@/data/salary-guides/hays_standardized.json";
import michaelPageData from "@/data/salary-guides/michael_page_standardized.json";

// Interfaces para o novo schema
interface FaixaPorPorte {
  min: string | null;
  media: string | null;
  max: string | null;
}

interface ResultadoFonte {
  encontrado: boolean;
  setor_encontrado: string | null;
  por_porte: {
    peq_med: FaixaPorPorte | null;
    grande: FaixaPorPorte | null;
  };
  trecho_consultado: string;
  observacao: string;
  fonte: string;
}

interface EstudoMercadoNovo {
  consulta: {
    cargo_pedido: string;
    senioridade: string;
    localidade: string;
  };
  resultado: {
    hays: ResultadoFonte;
    michael_page: ResultadoFonte;
  };
  consultoria: string[];
}

export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercadoNovo | null>(null);
  const [importing, setImporting] = useState(false);
  const [benchmarkCount, setBenchmarkCount] = useState<number | null>(null);
  const [checkingData, setCheckingData] = useState(true);

  // Form state simplificado
  const [cargo, setCargo] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [localidade, setLocalidade] = useState("");

  // Verificar se já existem dados importados
  useEffect(() => {
    const checkBenchmarks = async () => {
      try {
        const { count, error } = await supabase
          .from('salary_benchmarks')
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          setBenchmarkCount(count || 0);
        }
      } catch (e) {
        console.error('Erro ao verificar benchmarks:', e);
      } finally {
        setCheckingData(false);
      }
    };
    checkBenchmarks();
  }, []);

  // Importar dados de salário
  const handleImportData = async () => {
    setImporting(true);
    try {
      // Importar Hays
      const { data: haysResult, error: haysError } = await supabase.functions.invoke('import-salary-data', {
        body: {
          source: 'hays',
          data: haysData,
          clear_existing: true
        }
      });
      
      if (haysError) throw haysError;
      console.log('Hays importado:', haysResult);

      // Importar Michael Page
      const { data: mpResult, error: mpError } = await supabase.functions.invoke('import-salary-data', {
        body: {
          source: 'michael_page',
          data: michaelPageData,
          clear_existing: true
        }
      });
      
      if (mpError) throw mpError;
      console.log('Michael Page importado:', mpResult);

      const totalImported = (haysResult?.inserted || 0) + (mpResult?.inserted || 0);
      setBenchmarkCount(totalImported);
      toast.success(`Dados importados com sucesso! ${totalImported} registros.`);
    } catch (error: any) {
      console.error('Erro ao importar dados:', error);
      toast.error('Erro ao importar dados de salário');
    } finally {
      setImporting(false);
    }
  };

  const handleGerarEstudo = async () => {
    if (!cargo) {
      toast.error("Preencha o campo obrigatório: Cargo");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          cargo,
          senioridade: senioridade || null,
          localidade: localidade || null
        }
      });
      if (error) throw error;
      if (data?.erro) {
        toast.error(data.mensagem || "Erro ao gerar estudo");
        return;
      }
      setEstudo(data);
      toast.success("Estudo gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar estudo:", error);
      toast.error(error.message || "Erro ao gerar estudo de mercado");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!estudo) return;
    try {
      const doc = new jsPDF();
      const colors = {
        yellowPrimary: [255, 205, 0] as [number, number, number],
        yellowSecondary: [250, 236, 62] as [number, number, number],
        darkBlue: [0, 20, 29] as [number, number, number],
        grayText: [54, 64, 74] as [number, number, number],
        lightBg: [255, 253, 246] as [number, number, number],
        green: [34, 197, 94] as [number, number, number],
        red: [239, 68, 68] as [number, number, number]
      };
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxTextWidth = pageWidth - margin * 2;
      let yPos = 25;

      // ===== CAPA =====
      doc.setFillColor(...colors.lightBg);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setFillColor(...colors.yellowPrimary);
      doc.rect(0, pageHeight - 40, pageWidth, 40, "F");
      try {
        const imgData = await fetch(logoRhelloDark).then(r => r.blob()).then(b => new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(b);
        }));
        doc.addImage(imgData, "PNG", pageWidth / 2 - 20, pageHeight - 35, 40, 10);
      } catch (error) {
        console.error("Erro ao carregar logo:", error);
      }
      doc.setTextColor(...colors.darkBlue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("Estudo de Mercado Salarial", pageWidth / 2, 80, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const cargoLines = doc.splitTextToSize(estudo.consulta.cargo_pedido, maxTextWidth - 40);
      doc.text(cargoLines, pageWidth / 2, 100, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...colors.grayText);
      if (estudo.consulta.senioridade && estudo.consulta.senioridade !== 'Não especificado') {
        doc.text(`Senioridade: ${estudo.consulta.senioridade}`, pageWidth / 2, 120, { align: "center" });
      }
      if (estudo.consulta.localidade && estudo.consulta.localidade !== 'Brasil') {
        doc.text(`Localidade: ${estudo.consulta.localidade}`, pageWidth / 2, 130, { align: "center" });
      }
      doc.text(`Gerado por rhello flow em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 145, { align: "center" });

      // ===== PÁGINAS DE CONTEÚDO =====
      doc.addPage();
      yPos = 25;

      const checkSpace = (needed: number) => {
        if (yPos + needed > pageHeight - 25) {
          doc.addPage();
          yPos = 25;
        }
      };

      const addSectionTitle = (title: string) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text(title.toUpperCase(), margin, yPos);
        yPos += 10;
      };

      // Função para renderizar resultado de uma fonte
      const renderFonteResult = (fonte: ResultadoFonte, nomeFonte: string, xOffset: number, width: number) => {
        const startY = yPos;
        
        // Título da fonte
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text(nomeFonte, xOffset + 5, startY);
        
        // Status encontrado
        let currentY = startY + 8;
        if (fonte.encontrado) {
          doc.setFillColor(...colors.green);
          doc.circle(xOffset + 8, currentY - 2, 2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...colors.grayText);
          doc.text("Dados encontrados", xOffset + 13, currentY);
        } else {
          doc.setFillColor(...colors.red);
          doc.circle(xOffset + 8, currentY - 2, 2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...colors.grayText);
          doc.text("Não encontrado", xOffset + 13, currentY);
          return currentY + 10;
        }
        
        currentY += 8;
        
        // Setor encontrado
        if (fonte.setor_encontrado) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Setor:", xOffset + 5, currentY);
          doc.setFont("helvetica", "normal");
          const setorLines = doc.splitTextToSize(fonte.setor_encontrado, width - 30);
          doc.text(setorLines, xOffset + 20, currentY);
          currentY += setorLines.length * 4 + 4;
        }
        
        // Faixas por porte
        if (fonte.por_porte.peq_med) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Pequena/Média empresa:", xOffset + 5, currentY);
          currentY += 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Mín: ${fonte.por_porte.peq_med.min || '—'}`, xOffset + 10, currentY);
          doc.text(`Méd: ${fonte.por_porte.peq_med.media || '—'}`, xOffset + 45, currentY);
          doc.text(`Máx: ${fonte.por_porte.peq_med.max || '—'}`, xOffset + 80, currentY);
          currentY += 8;
        }
        
        if (fonte.por_porte.grande) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Grande empresa:", xOffset + 5, currentY);
          currentY += 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Mín: ${fonte.por_porte.grande.min || '—'}`, xOffset + 10, currentY);
          doc.text(`Méd: ${fonte.por_porte.grande.media || '—'}`, xOffset + 45, currentY);
          doc.text(`Máx: ${fonte.por_porte.grande.max || '—'}`, xOffset + 80, currentY);
          currentY += 8;
        }
        
        // Observação
        if (fonte.observacao) {
          currentY += 2;
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(...colors.grayText);
          const obsLines = doc.splitTextToSize(`Obs: ${fonte.observacao}`, width - 15);
          doc.text(obsLines, xOffset + 5, currentY);
          currentY += obsLines.length * 4;
        }
        
        return currentY;
      };

      // Comparativo lado a lado
      addSectionTitle("Comparativo Hays vs Michael Page");
      
      const colWidth = (maxTextWidth - 10) / 2;
      
      // Box Hays
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPos - 3, colWidth, 80, 2, 2, "F");
      doc.setDrawColor(...colors.yellowSecondary);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos - 3, colWidth, 80, 2, 2, "S");
      
      // Box Michael Page
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + colWidth + 10, yPos - 3, colWidth, 80, 2, 2, "F");
      doc.setDrawColor(...colors.yellowSecondary);
      doc.roundedRect(margin + colWidth + 10, yPos - 3, colWidth, 80, 2, 2, "S");
      
      renderFonteResult(estudo.resultado.hays, "HAYS 2026", margin, colWidth);
      renderFonteResult(estudo.resultado.michael_page, "MICHAEL PAGE 2026", margin + colWidth + 10, colWidth);
      
      yPos += 90;

      // Insights Consultivos
      if (estudo.consultoria && estudo.consultoria.length > 0) {
        checkSpace(50);
        addSectionTitle("Insights Consultivos");
        
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos - 3, maxTextWidth, estudo.consultoria.length * 12 + 10, 2, 2, "F");
        doc.setDrawColor(...colors.yellowSecondary);
        doc.roundedRect(margin, yPos - 3, maxTextWidth, estudo.consultoria.length * 12 + 10, 2, 2, "S");
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.darkBlue);
        
        estudo.consultoria.forEach((insight, idx) => {
          doc.setFont("helvetica", "bold");
          doc.text(`${idx + 1}.`, margin + 5, yPos + 5);
          doc.setFont("helvetica", "normal");
          const insightLines = doc.splitTextToSize(insight, maxTextWidth - 20);
          doc.text(insightLines, margin + 12, yPos + 5);
          yPos += insightLines.length * 5 + 7;
        });
        
        yPos += 15;
      }

      // Trechos consultados (para auditoria)
      checkSpace(60);
      addSectionTitle("Trechos Consultados (Auditoria)");
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.grayText);
      
      if (estudo.resultado.hays.encontrado && estudo.resultado.hays.trecho_consultado) {
        doc.setFont("helvetica", "bold");
        doc.text("Hays:", margin + 5, yPos);
        doc.setFont("helvetica", "normal");
        const haysLines = doc.splitTextToSize(estudo.resultado.hays.trecho_consultado, maxTextWidth - 10);
        doc.text(haysLines, margin + 5, yPos + 5);
        yPos += haysLines.length * 4 + 10;
      }
      
      if (estudo.resultado.michael_page.encontrado && estudo.resultado.michael_page.trecho_consultado) {
        doc.setFont("helvetica", "bold");
        doc.text("Michael Page:", margin + 5, yPos);
        doc.setFont("helvetica", "normal");
        const mpLines = doc.splitTextToSize(estudo.resultado.michael_page.trecho_consultado, maxTextWidth - 10);
        doc.text(mpLines, margin + 5, yPos + 5);
        yPos += mpLines.length * 4 + 10;
      }

      // ===== RODAPÉ EM TODAS AS PÁGINAS =====
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.setTextColor(...colors.grayText);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Gerado por rhello flow | www.rhello.com.br`, pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.text(`Pág. ${i}/${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      // Salvar PDF
      const fileName = `estudo-mercado-${estudo.consulta.cargo_pedido.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const renderFaixaPorte = (faixa: FaixaPorPorte | null, label: string) => {
    if (!faixa) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Mínimo</p>
            <p className="font-semibold">{faixa.min || '—'}</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Médio</p>
            <p className="font-bold text-primary">{faixa.media || '—'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Máximo</p>
            <p className="font-semibold">{faixa.max || '—'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderResultadoFonte = (fonte: ResultadoFonte, nomeFonte: string, corBorda: string) => {
    return (
      <Card className={`border-l-4 ${corBorda}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{nomeFonte}</CardTitle>
            {fonte.encontrado ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Encontrado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Não encontrado
              </Badge>
            )}
          </div>
          {fonte.setor_encontrado && (
            <p className="text-sm text-muted-foreground">Setor: {fonte.setor_encontrado}</p>
          )}
        </CardHeader>
        {fonte.encontrado && (
          <CardContent className="space-y-4">
            {renderFaixaPorte(fonte.por_porte.peq_med, "Pequena/Média Empresa")}
            {renderFaixaPorte(fonte.por_porte.grande, "Grande Empresa")}
            
            {fonte.observacao && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <Info className="h-4 w-4 inline mr-1" />
                  {fonte.observacao}
                </p>
              </div>
            )}
            
            {fonte.trecho_consultado && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Ver trecho consultado (auditoria)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground italic">
                    "{fonte.trecho_consultado}"
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Estudo de Mercado Salarial</h1>
          <p className="text-muted-foreground">Compare salários com dados reais de Hays e Michael Page 2026</p>
        </div>

        {/* Aviso de dados não importados */}
        {!checkingData && benchmarkCount === 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">Base de dados vazia</p>
                    <p className="text-sm text-amber-700">
                      É necessário importar os dados salariais antes de realizar consultas.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleImportData} 
                  disabled={importing}
                  variant="outline"
                  className="border-amber-400 text-amber-900 hover:bg-amber-100"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info de dados importados */}
        {!checkingData && benchmarkCount !== null && benchmarkCount > 0 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>{benchmarkCount.toLocaleString()} registros de benchmark disponíveis</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleImportData}
              disabled={importing}
              className="text-xs"
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Reimportar</span>
            </Button>
          </div>
        )}

        {/* Formulário Simplificado */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Informações da Consulta</CardTitle>
            <CardDescription>Preencha os dados para consultar as faixas salariais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">
                  Cargo <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="cargo" 
                  placeholder="Ex: Analista de Customer Success" 
                  value={cargo} 
                  onChange={e => setCargo(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senioridade">Senioridade</Label>
                <Select value={senioridade} onValueChange={setSenioridade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Júnior</SelectItem>
                    <SelectItem value="pleno">Pleno</SelectItem>
                    <SelectItem value="senior">Sênior</SelectItem>
                    <SelectItem value="especialista">Especialista</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localidade">Localidade</Label>
                <Input 
                  id="localidade" 
                  placeholder="Ex: São Paulo, Brasil" 
                  value={localidade} 
                  onChange={e => setLocalidade(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleGerarEstudo} disabled={loading} className="h-11 px-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  "Consultar Faixas Salariais"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {estudo && (
          <div className="space-y-6">
            {/* Header do resultado */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{estudo.consulta.cargo_pedido}</h2>
                <p className="text-muted-foreground">
                  {estudo.consulta.senioridade !== 'Não especificado' && `${estudo.consulta.senioridade} • `}
                  {estudo.consulta.localidade}
                </p>
              </div>
              <Button onClick={handleExportarPDF} variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>

            {/* Comparativo lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderResultadoFonte(estudo.resultado.hays, "Hays 2026", "border-l-blue-500")}
              {renderResultadoFonte(estudo.resultado.michael_page, "Michael Page 2026", "border-l-purple-500")}
            </div>

            {/* Insights Consultivos */}
            {estudo.consultoria && estudo.consultoria.length > 0 && (
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Insights Consultivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {estudo.consultoria.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <p className="text-muted-foreground">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Fontes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fontes Consultadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {estudo.resultado.hays.encontrado && (
                    <Badge variant="secondary">{estudo.resultado.hays.fonte}</Badge>
                  )}
                  {estudo.resultado.michael_page.encontrado && (
                    <Badge variant="secondary">{estudo.resultado.michael_page.fonte}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Todos os valores em R$/mês. Dados extraídos dos guias salariais oficiais.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

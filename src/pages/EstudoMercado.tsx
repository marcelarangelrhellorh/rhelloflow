import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, FileDown } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import jsPDF from "jspdf";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";

interface FaixaSalarial {
  tipo_contratacao: string;
  salario_media: number | null;
  salario_min: number | null;
  salario_max: number | null;
}

interface EstudoRegional {
  regiao: string;
  faixas_salariais: FaixaSalarial[];
  comparacao_oferta: "Abaixo" | "Dentro" | "Acima" | "Sem dado";
  beneficios: string[];
  demanda: "Alta" | "Média" | "Baixa";
  observacoes: string;
}

interface EstudoMercado {
  funcao: string;
  regioes: string[];
  senioridade: string | null;
  tipos_contratacao: string[];
  jornada: string | null;
  salario_ofertado: number | null;
  tipo_contratacao_ofertado: string | null;
  estudos_regionais: EstudoRegional[];
  tendencia_short: string | null;
  fontes: Array<{
    nome: string;
    url: string;
  }>;
  raw?: object;
}

const regioesOpcoes = [
  { label: "Acre - AC", value: "Acre - AC" },
  { label: "Alagoas - AL", value: "Alagoas - AL" },
  { label: "Amapá - AP", value: "Amapá - AP" },
  { label: "Amazonas - AM", value: "Amazonas - AM" },
  { label: "Bahia - BA", value: "Bahia - BA" },
  { label: "Ceará - CE", value: "Ceará - CE" },
  { label: "Distrito Federal - DF", value: "Distrito Federal - DF" },
  { label: "Espírito Santo - ES", value: "Espírito Santo - ES" },
  { label: "Goiás - GO", value: "Goiás - GO" },
  { label: "Maranhão - MA", value: "Maranhão - MA" },
  { label: "Mato Grosso - MT", value: "Mato Grosso - MT" },
  { label: "Mato Grosso do Sul - MS", value: "Mato Grosso do Sul - MS" },
  { label: "Minas Gerais - MG", value: "Minas Gerais - MG" },
  { label: "Pará - PA", value: "Pará - PA" },
  { label: "Paraíba - PB", value: "Paraíba - PB" },
  { label: "Paraná - PR", value: "Paraná - PR" },
  { label: "Pernambuco - PE", value: "Pernambuco - PE" },
  { label: "Piauí - PI", value: "Piauí - PI" },
  { label: "Rio de Janeiro - RJ", value: "Rio de Janeiro - RJ" },
  { label: "Rio Grande do Norte - RN", value: "Rio Grande do Norte - RN" },
  { label: "Rio Grande do Sul - RS", value: "Rio Grande do Sul - RS" },
  { label: "Rondônia - RO", value: "Rondônia - RO" },
  { label: "Roraima - RR", value: "Roraima - RR" },
  { label: "Santa Catarina - SC", value: "Santa Catarina - SC" },
  { label: "São Paulo - SP", value: "São Paulo - SP" },
  { label: "Sergipe - SE", value: "Sergipe - SE" },
  { label: "Tocantins - TO", value: "Tocantins - TO" },
];

export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercado | null>(null);

  // Form state
  const [funcao, setFuncao] = useState("");
  const [regioes, setRegioes] = useState<string[]>([]);
  const [senioridade, setSenioridade] = useState("");
  const [tiposContratacao, setTiposContratacao] = useState<string[]>([]);
  const [jornada, setJornada] = useState("");
  const [salarioOfertado, setSalarioOfertado] = useState("");
  const [tipoContratacaoOfertado, setTipoContratacaoOfertado] = useState("");

  const handleGerarEstudo = async () => {
    if (!funcao || regioes.length === 0) {
      toast.error("Preencha os campos obrigatórios: Função e ao menos uma Região");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          funcao,
          regioes,
          senioridade: senioridade || null,
          tipos_contratacao: tiposContratacao,
          jornada: jornada || null,
          salario_ofertado: salarioOfertado ? parseFloat(salarioOfertado) : null,
          tipo_contratacao_ofertado: tipoContratacaoOfertado || null
        }
      });

      if (error) throw error;
      if (data?.erro) {
        toast.error(data.mensagem);
        return;
      }

      setEstudo(data);
      toast.success("Estudo de mercado gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar estudo:", error);
      toast.error(error.message || "Erro ao gerar estudo de mercado");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getComparacaoIcon = (comparacao: string) => {
    switch (comparacao) {
      case "Abaixo":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "Acima":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "Dentro":
        return <Minus className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDemandaColor = (demanda: string) => {
    switch (demanda) {
      case "Alta":
        return "bg-green-500 text-white";
      case "Média":
        return "bg-yellow-500 text-white";
      case "Baixa":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
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
        lightBg: [255, 253, 246] as [number, number, number]
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // ===== CAPA =====
      doc.setFillColor(...colors.lightBg);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      doc.setFillColor(...colors.yellowPrimary);
      doc.rect(0, pageHeight - 40, pageWidth, 40, "F");

      try {
        const imgData = await fetch(logoRhelloDark).then(r => r.blob()).then(b => 
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(b);
          })
        );
        doc.addImage(imgData, "PNG", pageWidth / 2 - 20, pageHeight - 35, 40, 10);
      } catch (error) {
        console.error("Erro ao carregar logo:", error);
      }

      doc.setTextColor(...colors.darkBlue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Estudo de Mercado Comparativo", pageWidth / 2, 80, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(estudo.funcao, pageWidth / 2, 100, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...colors.grayText);
      doc.text(`Regiões: ${estudo.regioes.join(", ")}`, pageWidth / 2, 115, { align: "center" });
      doc.text(`Gerado por rhello flow em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 125, { align: "center" });

      // ===== PÁGINAS DE CONTEÚDO =====
      doc.addPage();
      yPos = 20;

      const checkSpace = (needed: number) => {
        if (yPos + needed > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      };

      const addSectionTitle = (title: string) => {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text(title.toUpperCase(), 15, yPos);
        yPos += 8;
      };

      // Info Geral
      addSectionTitle("Informações Gerais");
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, yPos - 3, pageWidth - 30, 30, 2, 2, "F");
      doc.setDrawColor(...colors.yellowSecondary);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, yPos - 3, pageWidth - 30, 30, 2, 2, "S");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.darkBlue);
      
      const col1X = 20;
      const col2X = pageWidth / 2 + 5;
      
      doc.text("Função:", col1X, yPos + 2);
      doc.setFont("helvetica", "normal");
      doc.text(estudo.funcao, col1X + 20, yPos + 2);
      
      if (estudo.senioridade) {
        doc.setFont("helvetica", "bold");
        doc.text("Senioridade:", col2X, yPos + 2);
        doc.setFont("helvetica", "normal");
        doc.text(estudo.senioridade, col2X + 25, yPos + 2);
      }

      doc.setFont("helvetica", "bold");
      doc.text("Regiões:", col1X, yPos + 10);
      doc.setFont("helvetica", "normal");
      const regioesText = doc.splitTextToSize(estudo.regioes.join(", "), 80);
      doc.text(regioesText, col1X + 20, yPos + 10);

      if (estudo.jornada) {
        doc.setFont("helvetica", "bold");
        doc.text("Modelo:", col2X, yPos + 10);
        doc.setFont("helvetica", "normal");
        doc.text(estudo.jornada, col2X + 20, yPos + 10);
      }

      if (estudo.tipos_contratacao.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Contratação:", col1X, yPos + 18);
        doc.setFont("helvetica", "normal");
        doc.text(estudo.tipos_contratacao.join(", "), col1X + 28, yPos + 18);
      }

      yPos += 38;

      // Comparativo por Região
      estudo.estudos_regionais.forEach((regional) => {
        checkSpace(60);
        
        addSectionTitle(`${regional.regiao}`);
        
        doc.setFillColor(255, 255, 255);
        const boxHeight = 55 + (regional.faixas_salariais.length > 1 ? 15 : 0);
        doc.roundedRect(15, yPos - 3, pageWidth - 30, boxHeight, 2, 2, "F");
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, yPos - 3, pageWidth - 30, boxHeight, 2, 2, "S");

        // Faixas Salariais
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text("Faixas Salariais", 20, yPos + 2);

        let faixaY = yPos + 10;
        regional.faixas_salariais.forEach((faixa) => {
          if (regional.faixas_salariais.length > 1) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(faixa.tipo_contratacao, 25, faixaY);
            faixaY += 6;
          }

          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          
          const salX = 25;
          doc.text("Mín:", salX, faixaY);
          doc.text(formatCurrency(faixa.salario_min), salX + 10, faixaY);
          
          doc.text("Méd:", salX + 40, faixaY);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.darkBlue);
          doc.text(formatCurrency(faixa.salario_media), salX + 50, faixaY);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          doc.text("Máx:", salX + 80, faixaY);
          doc.text(formatCurrency(faixa.salario_max), salX + 90, faixaY);
          
          faixaY += 8;
        });

        // Comparação Oferta e Demanda
        faixaY += 2;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text("Comparação Oferta:", 20, faixaY);
        doc.setFont("helvetica", "normal");
        doc.text(regional.comparacao_oferta, 55, faixaY);

        doc.setFont("helvetica", "bold");
        doc.text("Demanda:", 100, faixaY);
        doc.setFont("helvetica", "normal");
        
        if (regional.demanda === "Alta") doc.setTextColor(0, 128, 0);
        else if (regional.demanda === "Média") doc.setTextColor(255, 165, 0);
        else doc.setTextColor(255, 0, 0);
        doc.text(regional.demanda, 120, faixaY);
        doc.setTextColor(...colors.darkBlue);

        // Benefícios
        if (regional.beneficios.length > 0) {
          faixaY += 8;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("Benefícios:", 20, faixaY);
          faixaY += 6;
          
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          
          let xPos = 25;
          regional.beneficios.slice(0, 4).forEach((beneficio) => {
            const badgeWidth = Math.min(doc.getTextWidth(beneficio) + 6, 40);
            
            if (xPos + badgeWidth > pageWidth - 20) {
              xPos = 25;
              faixaY += 6;
            }

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(xPos, faixaY - 3, badgeWidth, 5, 1, 1, "F");
            doc.setDrawColor(...colors.yellowSecondary);
            doc.setLineWidth(0.2);
            doc.roundedRect(xPos, faixaY - 3, badgeWidth, 5, 1, 1, "S");
            
            doc.text(beneficio, xPos + 2, faixaY);
            xPos += badgeWidth + 3;
          });
        }

        yPos += boxHeight + 8;
      });

      // Tendência Geral
      if (estudo.tendencia_short) {
        checkSpace(20);
        addSectionTitle("Tendência Geral");
        
        doc.setFillColor(255, 255, 255);
        const tendLines = doc.splitTextToSize(estudo.tendencia_short, pageWidth - 40);
        const tendHeight = Math.max(12, tendLines.length * 4 + 6);
        
        doc.roundedRect(15, yPos - 3, pageWidth - 30, tendHeight, 2, 2, "F");
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, yPos - 3, pageWidth - 30, tendHeight, 2, 2, "S");

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.darkBlue);
        doc.text(tendLines, 20, yPos + 2);
        
        yPos += tendHeight + 8;
      }

      // Fontes
      if (estudo.fontes.length > 0) {
        checkSpace(25);
        addSectionTitle("Fontes Consultadas");
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.grayText);

        estudo.fontes.slice(0, 5).forEach((fonte) => {
          doc.text(`• ${fonte.nome}`, 20, yPos);
          yPos += 4;
        });

        if (estudo.fontes.length > 5) {
          doc.text(`... e mais ${estudo.fontes.length - 5} fontes`, 20, yPos);
          yPos += 4;
        }

        yPos += 6;
      }

      // ===== RODAPÉ EM TODAS AS PÁGINAS =====
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
        
        doc.setTextColor(...colors.grayText);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Gerado por rhello flow | www.rhello.com.br`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
        
        doc.text(
          `Pág. ${i}/${totalPages}`,
          pageWidth - 15,
          pageHeight - 6,
          { align: "right" }
        );
      }

      // Salvar PDF
      const fileName = `estudo-mercado-comparativo-${estudo.funcao.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#00141d' }}>
      <div className="container mx-auto p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Estudo de Mercado Comparativo</h1>
          <p className="text-slate-50">Compare múltiplas regiões do país para uma função</p>
        </div>

        {/* Formulário */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle>Informações da Consulta</CardTitle>
            <CardDescription>Preencha os dados para gerar o estudo de mercado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funcao">
                  Função <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="funcao"
                  placeholder="Ex: Analista de Customer Success"
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regioes">
                  Regiões <span className="text-red-500">*</span>
                </Label>
                <MultiSelect
                  options={regioesOpcoes}
                  value={regioes}
                  onChange={setRegioes}
                  placeholder="Selecione uma ou mais regiões"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senioridade">Senioridade</Label>
                <Select value={senioridade} onValueChange={setSenioridade}>
                  <SelectTrigger id="senioridade">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Júnior">Júnior</SelectItem>
                    <SelectItem value="Pleno">Pleno</SelectItem>
                    <SelectItem value="Sênior">Sênior</SelectItem>
                    <SelectItem value="Especialista">Especialista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jornada">Modelo de Trabalho</Label>
                <Select value={jornada} onValueChange={setJornada}>
                  <SelectTrigger id="jornada">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="Remoto">Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tiposContratacao">Tipos de Contratação</Label>
                <MultiSelect
                  options={[
                    { label: "CLT", value: "CLT" },
                    { label: "PJ", value: "PJ" },
                    { label: "Temporário", value: "Temporário" },
                    { label: "Estágio", value: "Estágio" }
                  ]}
                  value={tiposContratacao}
                  onChange={setTiposContratacao}
                  placeholder="Selecione um ou mais tipos (opcional)"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="salarioOfertado">Salário Ofertado (opcional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="salarioOfertado"
                    type="number"
                    placeholder="Ex: 5000"
                    value={salarioOfertado}
                    onChange={(e) => setSalarioOfertado(e.target.value)}
                  />
                  <Select
                    value={tipoContratacaoOfertado}
                    onValueChange={setTipoContratacaoOfertado}
                    disabled={!salarioOfertado}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de contratação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGerarEstudo}
              disabled={loading}
              className="w-full bg-[#faec3e] text-slate-950 hover:bg-[#faec3e]/90 h-11 px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Estudo"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {estudo && (
          <>
            <div className="flex justify-end no-print">
              <Button
                onClick={handleExportarPDF}
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>

            {/* Informações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Função</p>
                    <p className="font-semibold">{estudo.funcao}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regiões Analisadas</p>
                    <p className="font-semibold">{estudo.regioes.join(", ")}</p>
                  </div>
                  {estudo.senioridade && (
                    <div>
                      <p className="text-sm text-muted-foreground">Senioridade</p>
                      <p className="font-semibold">{estudo.senioridade}</p>
                    </div>
                  )}
                  {estudo.tipos_contratacao.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tipos de Contratação</p>
                      <div className="flex flex-wrap gap-2">
                        {estudo.tipos_contratacao.map((tipo, index) => (
                          <Badge key={index} variant="outline">
                            {tipo}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {estudo.jornada && (
                    <div>
                      <p className="text-sm text-muted-foreground">Modelo de Trabalho</p>
                      <p className="font-semibold">{estudo.jornada}</p>
                    </div>
                  )}
                  {estudo.salario_ofertado && (
                    <div>
                      <p className="text-sm text-muted-foreground">Salário Ofertado</p>
                      <p className="font-semibold">
                        {formatCurrency(estudo.salario_ofertado)}
                        {estudo.tipo_contratacao_ofertado && ` (${estudo.tipo_contratacao_ofertado})`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comparativo Regional com Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Análise Comparativa por Região</CardTitle>
                <CardDescription>Compare os dados de mercado entre as regiões selecionadas</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={estudo.estudos_regionais[0]?.regiao} className="w-full">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${estudo.estudos_regionais.length}, 1fr)` }}>
                    {estudo.estudos_regionais.map((regional) => (
                      <TabsTrigger key={regional.regiao} value={regional.regiao}>
                        {regional.regiao}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {estudo.estudos_regionais.map((regional) => (
                    <TabsContent key={regional.regiao} value={regional.regiao} className="space-y-6">
                      {/* Faixas Salariais */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Faixas Salariais</h3>
                        {regional.faixas_salariais.map((faixa, index) => (
                          <div key={index} className="space-y-3">
                            {regional.faixas_salariais.length > 1 && (
                              <h4 className="font-semibold text-base">{faixa.tipo_contratacao}</h4>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Mínimo</p>
                                <p className="text-2xl font-bold">{formatCurrency(faixa.salario_min)}</p>
                              </div>
                              <div className="text-center p-4 bg-primary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Média</p>
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(faixa.salario_media)}
                                </p>
                              </div>
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Máximo</p>
                                <p className="text-2xl font-bold">{formatCurrency(faixa.salario_max)}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {estudo.salario_ofertado && (
                          <div className="mt-4 p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Comparação com Salário Ofertado
                                  {estudo.tipo_contratacao_ofertado && ` (${estudo.tipo_contratacao_ofertado})`}
                                </p>
                                <p className="text-xl font-bold">{formatCurrency(estudo.salario_ofertado)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getComparacaoIcon(regional.comparacao_oferta)}
                                <span className="font-semibold">{regional.comparacao_oferta}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Demanda */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Demanda no Mercado</h3>
                        <Badge className={`text-lg px-4 py-2 ${getDemandaColor(regional.demanda)}`}>
                          {regional.demanda}
                        </Badge>
                      </div>

                      {/* Benefícios */}
                      {regional.beneficios.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Benefícios Mais Comuns</h3>
                          <div className="flex flex-wrap gap-2">
                            {regional.beneficios.map((beneficio, index) => (
                              <Badge key={index} variant="secondary" className="text-sm">
                                {beneficio}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observações */}
                      {regional.observacoes && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Observações</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {regional.observacoes}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Tendência Geral */}
            {estudo.tendencia_short && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendência Geral do Mercado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{estudo.tendencia_short}</p>
                </CardContent>
              </Card>
            )}

            {/* Fontes */}
            <Card>
              <CardHeader>
                <CardTitle>Fontes Consultadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {estudo.fontes.map((fonte, index) => (
                    <li key={index} className="text-sm">
                      <a
                        href={fonte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {fonte.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

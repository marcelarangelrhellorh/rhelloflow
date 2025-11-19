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
  tendencia: string;
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
  const [cidades, setCidades] = useState("");
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
      // Processar cidades (separadas por vírgula)
      const cidadesArray = cidades
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          funcao,
          regioes,
          cidades: cidadesArray.length > 0 ? cidadesArray : null,
          senioridade: senioridade || null,
          tipos_contratacao: tiposContratacao,
          jornada: jornada || null,
          salario_ofertado: salarioOfertado ? parseFloat(salarioOfertado) : null,
          tipo_contratacao_ofertado: tipoContratacaoOfertado || null
        }
      });

      if (error) throw error;
      if (data?.erro) {
        toast.error(data.erro);
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
      const margin = 20;
      const maxTextWidth = pageWidth - (margin * 2);
      let yPos = 25;

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
      doc.setFontSize(24);
      doc.text("Estudo de Mercado Comparativo", pageWidth / 2, 80, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const funcaoLines = doc.splitTextToSize(estudo.funcao, maxTextWidth - 40);
      doc.text(funcaoLines, pageWidth / 2, 100, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...colors.grayText);
      const regioesCapaLines = doc.splitTextToSize(`Regiões: ${estudo.regioes.join(", ")}`, maxTextWidth - 40);
      doc.text(regioesCapaLines, pageWidth / 2, 120, { align: "center" });
      doc.text(`Gerado por rhello flow em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 135, { align: "center" });

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

      // Info Geral
      addSectionTitle("Informações Gerais");
      
      // Calcular altura dinâmica baseada no conteúdo - aumentar espaço para Regiões
      const regioesTextCalc = estudo.regioes.join(", ");
      const regioesLinesCalc = doc.splitTextToSize(regioesTextCalc, maxTextWidth - 30);
      let infoBoxHeight = 28 + (regioesLinesCalc.length * 5); // Altura base + linhas de regiões
      
      if (estudo.tipos_contratacao.length > 0) {
        const tiposText = estudo.tipos_contratacao.join(", ");
        if (tiposText.length > 30) infoBoxHeight += 8;
      }
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPos - 3, maxTextWidth, infoBoxHeight, 2, 2, "F");
      doc.setDrawColor(...colors.yellowSecondary);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos - 3, maxTextWidth, infoBoxHeight, 2, 2, "S");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.darkBlue);
      
      const col1X = margin + 5;
      const col2X = pageWidth / 2 + 5;
      const colWidth = (maxTextWidth / 2) - 10;
      
      let currentY = yPos + 3;
      
      // Linha 1: Função e Senioridade
      doc.text("Função:", col1X, currentY);
      doc.setFont("helvetica", "normal");
      const funcaoTextLines = doc.splitTextToSize(estudo.funcao, colWidth - 20);
      doc.text(funcaoTextLines, col1X + 22, currentY);
      
      if (estudo.senioridade) {
        doc.setFont("helvetica", "bold");
        doc.text("Senioridade:", col2X, currentY);
        doc.setFont("helvetica", "normal");
        const senioridadeLines = doc.splitTextToSize(estudo.senioridade, colWidth - 30);
        doc.text(senioridadeLines, col2X + 30, currentY);
      }

      currentY += 10;

      // Linha 2: Regiões (linha completa com mais espaço)
      doc.setFont("helvetica", "bold");
      doc.text("Regiões:", col1X, currentY);
      doc.setFont("helvetica", "normal");
      const regioesLines = doc.splitTextToSize(estudo.regioes.join(", "), maxTextWidth - 30);
      doc.text(regioesLines, col1X + 22, currentY);
      
      currentY += (regioesLines.length * 5) + 5;

      // Linha 3: Modelo e Tipos de Contratação
      if (estudo.jornada) {
        doc.setFont("helvetica", "bold");
        doc.text("Modelo:", col1X, currentY);
        doc.setFont("helvetica", "normal");
        // Capitalizar primeira letra
        const jornadaCapitalized = estudo.jornada.charAt(0).toUpperCase() + estudo.jornada.slice(1);
        const jornadaLines = doc.splitTextToSize(jornadaCapitalized, colWidth - 30);
        doc.text(jornadaLines, col1X + 22, currentY);
      }

      if (estudo.tipos_contratacao.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Tipos de Contratação:", col2X, currentY);
        doc.setFont("helvetica", "normal");
        // Transformar "pj" em "PJ"
        const tiposFormatted = estudo.tipos_contratacao.map(tipo => 
          tipo.toLowerCase() === 'pj' ? 'PJ' : tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase()
        ).join(", ");
        const tiposLines = doc.splitTextToSize(tiposFormatted, colWidth - 48);
        doc.text(tiposLines, col2X + 48, currentY);
      }

      yPos += infoBoxHeight + 7;

      // Comparativo por Região/Cidade
      estudo.estudos_regionais.forEach((regional) => {
        checkSpace(90);
        
        addSectionTitle(`${regional.regiao}`);
        
        // Calcular altura dinâmica do box baseado no conteúdo
        const hasBeneficios = regional.beneficios && regional.beneficios.length > 0;
        const hasObservacoes = regional.observacoes && regional.observacoes.trim().length > 0;
        const hasTendencia = regional.tendencia && regional.tendencia.trim().length > 0;
        
        let dynamicHeight = 40; // Base
        if (regional.faixas_salariais.length > 1) dynamicHeight += 18;
        if (hasBeneficios) dynamicHeight += 18;
        if (hasObservacoes) {
          const obsLines = doc.splitTextToSize(regional.observacoes, maxTextWidth - 20);
          dynamicHeight += (obsLines.length * 5) + 12;
        }
        if (hasTendencia) {
          const tendLines = doc.splitTextToSize(regional.tendencia, maxTextWidth - 20);
          dynamicHeight += (tendLines.length * 5) + 12;
        }
        
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos - 3, maxTextWidth, dynamicHeight, 2, 2, "F");
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPos - 3, maxTextWidth, dynamicHeight, 2, 2, "S");

        // Faixas Salariais
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text("Faixas Salariais", margin + 5, yPos + 3);

        let faixaY = yPos + 12;
        regional.faixas_salariais.forEach((faixa) => {
          if (regional.faixas_salariais.length > 1) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(faixa.tipo_contratacao, margin + 10, faixaY);
            faixaY += 7;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          
          const salX = margin + 10;
          doc.text("Mín:", salX, faixaY);
          doc.text(formatCurrency(faixa.salario_min), salX + 12, faixaY);
          
          doc.text("Méd:", salX + 45, faixaY);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.darkBlue);
          doc.text(formatCurrency(faixa.salario_media), salX + 57, faixaY);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          doc.text("Máx:", salX + 92, faixaY);
          doc.text(formatCurrency(faixa.salario_max), salX + 104, faixaY);
          
          faixaY += 9;
        });

        // Comparação Oferta e Demanda
        faixaY += 3;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.darkBlue);
        doc.text("Comparação Oferta:", margin + 5, faixaY);
        doc.setFont("helvetica", "normal");
        doc.text(regional.comparacao_oferta, margin + 52, faixaY);

        doc.setFont("helvetica", "bold");
        doc.text("Demanda:", margin + 100, faixaY);
        doc.setFont("helvetica", "normal");
        
        if (regional.demanda === "Alta") doc.setTextColor(0, 128, 0);
        else if (regional.demanda === "Média") doc.setTextColor(255, 165, 0);
        else doc.setTextColor(255, 0, 0);
        doc.text(regional.demanda, margin + 125, faixaY);
        doc.setTextColor(...colors.darkBlue);

        faixaY += 9;

        // Benefícios
        if (hasBeneficios) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Benefícios:", margin + 5, faixaY);
          faixaY += 7;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          
          let xPos = margin + 10;
          regional.beneficios.slice(0, 4).forEach((beneficio) => {
            const benLines = doc.splitTextToSize(beneficio, 35);
            const badgeWidth = Math.min(doc.getTextWidth(benLines[0]) + 8, 38);
            
            if (xPos + badgeWidth > pageWidth - margin - 5) {
              xPos = margin + 10;
              faixaY += 7;
            }

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(xPos, faixaY - 4, badgeWidth, 6, 1, 1, "F");
            doc.setDrawColor(...colors.yellowSecondary);
            doc.setLineWidth(0.2);
            doc.roundedRect(xPos, faixaY - 4, badgeWidth, 6, 1, 1, "S");
            
            doc.text(benLines[0], xPos + 3, faixaY);
            xPos += badgeWidth + 4;
          });
          
          faixaY += 9;
        }

        // Observações (específicas da cidade/região)
        if (hasObservacoes) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.darkBlue);
          doc.text("Observações:", margin + 5, faixaY);
          faixaY += 7;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          const obsLines = doc.splitTextToSize(regional.observacoes, maxTextWidth - 20);
          doc.text(obsLines, margin + 10, faixaY);
          faixaY += (obsLines.length * 5) + 4;
        }

        // Tendência (específica da cidade/região)
        if (hasTendencia) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.darkBlue);
          doc.text("Tendência:", margin + 5, faixaY);
          faixaY += 7;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...colors.grayText);
          const tendLines = doc.splitTextToSize(regional.tendencia, maxTextWidth - 20);
          doc.text(tendLines, margin + 10, faixaY);
        }

        yPos += dynamicHeight + 10;
      });

      // Tendência Geral
      if (estudo.tendencia_short) {
        checkSpace(25);
        addSectionTitle("Tendência Geral");
        
        doc.setFillColor(255, 255, 255);
        const tendLines = doc.splitTextToSize(estudo.tendencia_short, maxTextWidth - 10);
        const tendHeight = Math.max(15, tendLines.length * 5 + 8);
        
        doc.roundedRect(margin, yPos - 3, maxTextWidth, tendHeight, 2, 2, "F");
        doc.setDrawColor(...colors.yellowSecondary);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPos - 3, maxTextWidth, tendHeight, 2, 2, "S");

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.darkBlue);
        doc.text(tendLines, margin + 5, yPos + 3);
        
        yPos += tendHeight + 10;
      }

      // Fontes
      if (estudo.fontes.length > 0) {
        checkSpace(30);
        addSectionTitle("Fontes Consultadas");
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.grayText);

        estudo.fontes.slice(0, 5).forEach((fonte) => {
          const fonteLines = doc.splitTextToSize(`• ${fonte.nome}`, maxTextWidth - 10);
          doc.text(fonteLines, margin + 5, yPos);
          yPos += fonteLines.length * 5;
        });

        if (estudo.fontes.length > 5) {
          doc.text(`... e mais ${estudo.fontes.length - 5} fontes`, margin + 5, yPos);
          yPos += 5;
        }

        yPos += 8;
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
        doc.text(
          `Gerado por rhello flow | www.rhello.com.br`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
        
        doc.text(
          `Pág. ${i}/${totalPages}`,
          pageWidth - margin,
          pageHeight - 8,
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
                  placeholder="Selecione as regiões..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidades">Cidades (opcional)</Label>
                <Input
                  id="cidades"
                  placeholder="Ex: São Paulo, Belo Horizonte, Porto Alegre"
                  value={cidades}
                  onChange={(e) => setCidades(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separe múltiplas cidades por vírgula para análise comparativa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senioridade">Senioridade</Label>
                <Select value={senioridade} onValueChange={setSenioridade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a senioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Júnior</SelectItem>
                    <SelectItem value="pleno">Pleno</SelectItem>
                    <SelectItem value="senior">Sênior</SelectItem>
                    <SelectItem value="especialista">Especialista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jornada">Modelo de Trabalho</Label>
                <Select value={jornada} onValueChange={setJornada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipos-contratacao">Tipos de Contratação (opcional)</Label>
                <MultiSelect
                  options={[
                    { label: "CLT", value: "clt" },
                    { label: "PJ", value: "pj" },
                    { label: "Temporário", value: "temporario" },
                  ]}
                  value={tiposContratacao}
                  onChange={setTiposContratacao}
                  placeholder="Selecione os tipos..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salario-ofertado">Salário Ofertado (opcional)</Label>
                <Input
                  id="salario-ofertado"
                  type="number"
                  placeholder="Ex: 5000"
                  value={salarioOfertado}
                  onChange={(e) => setSalarioOfertado(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-contratacao-ofertado">Tipo Ofertado (opcional)</Label>
                <Select value={tipoContratacaoOfertado} onValueChange={setTipoContratacaoOfertado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="temporario">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                onClick={handleGerarEstudo} 
                disabled={loading}
                className="bg-[#faec3e] text-slate-950 hover:bg-[#ffcd00] h-11 px-6"
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
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {estudo && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{estudo.funcao}</CardTitle>
                  <CardDescription>
                    Regiões analisadas: {estudo.regioes.join(", ")}
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleExportarPDF}
                  variant="outline"
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={estudo.estudos_regionais[0]?.regiao || ""} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${estudo.estudos_regionais.length}, 1fr)` }}>
                  {estudo.estudos_regionais.map((regional) => (
                    <TabsTrigger key={regional.regiao} value={regional.regiao}>
                      {regional.regiao}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {estudo.estudos_regionais.map((regional) => (
                  <TabsContent key={regional.regiao} value={regional.regiao} className="space-y-6 mt-6">
                    {/* Faixas Salariais */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Faixas Salariais</h3>
                      <div className="space-y-3">
                        {regional.faixas_salariais.map((faixa, idx) => (
                          <Card key={idx}>
                            <CardContent className="pt-6">
                              {regional.faixas_salariais.length > 1 && (
                                <p className="font-semibold mb-2">{faixa.tipo_contratacao}</p>
                              )}
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-sm text-muted-foreground">Mínimo</p>
                                  <p className="text-lg font-semibold">{formatCurrency(faixa.salario_min)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Médio</p>
                                  <p className="text-2xl font-bold text-primary">{formatCurrency(faixa.salario_media)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Máximo</p>
                                  <p className="text-lg font-semibold">{formatCurrency(faixa.salario_max)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Comparação e Demanda */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            {getComparacaoIcon(regional.comparacao_oferta)}
                            <div>
                              <p className="text-sm text-muted-foreground">Comparação com Oferta</p>
                              <p className="text-lg font-semibold">{regional.comparacao_oferta}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Badge className={getDemandaColor(regional.demanda)} style={{ fontSize: '1.25rem', padding: '0.5rem 1rem' }}>
                              {regional.demanda}
                            </Badge>
                            <div>
                              <p className="text-sm text-muted-foreground">Demanda de Mercado</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Benefícios */}
                    {regional.beneficios.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Benefícios Comuns</h3>
                        <div className="flex flex-wrap gap-2">
                          {regional.beneficios.map((beneficio, idx) => (
                            <Badge key={idx} variant="secondary" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
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
                        <Card>
                          <CardContent className="pt-6">
                            <p className="text-muted-foreground whitespace-pre-wrap">{regional.observacoes}</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Tendência Geral */}
              {estudo.tendencia_short && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Tendência Geral de Mercado</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground whitespace-pre-wrap">{estudo.tendencia_short}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Fontes */}
              {estudo.fontes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Fontes Consultadas</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <ul className="space-y-2">
                        {estudo.fontes.map((fonte, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            • {fonte.nome}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

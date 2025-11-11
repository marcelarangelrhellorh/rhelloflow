import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, FileDown } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import jsPDF from "jspdf";
interface FaixaSalarial {
  tipo_contratacao: string;
  salario_media: number | null;
  salario_min: number | null;
  salario_max: number | null;
}
interface EstudoMercado {
  funcao: string;
  regiao: string;
  senioridade: string | null;
  tipos_contratacao: string[];
  jornada: string | null;
  faixas_salariais: FaixaSalarial[];
  salario_ofertado: number | null;
  tipo_contratacao_ofertado: string | null;
  comparacao_oferta: "Abaixo" | "Dentro" | "Acima" | "Sem dado";
  beneficios: string[];
  demanda: "Alta" | "Média" | "Baixa";
  tendencia_short: string | null;
  fontes: Array<{
    nome: string;
    url: string;
  }>;
  observacoes: string;
  raw?: object;
}
export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercado | null>(null);

  // Form state
  const [funcao, setFuncao] = useState("");
  const [regiao, setRegiao] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [tiposContratacao, setTiposContratacao] = useState<string[]>([]);
  const [jornada, setJornada] = useState("");
  const [salarioOfertado, setSalarioOfertado] = useState("");
  const [tipoContratacaoOfertado, setTipoContratacaoOfertado] = useState("");
  const handleGerarEstudo = async () => {
    if (!funcao || !regiao) {
      toast.error("Preencha os campos obrigatórios: Função e Região");
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          funcao,
          regiao,
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
        return "bg-red-100 text-red-800 border-red-300";
      case "Média":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Baixa":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  const handleExportarPDF = () => {
    if (!estudo) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header com fundo amarelo Rhello
      doc.setFillColor(255, 205, 0);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(0, 20, 29);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ESTUDO DE MERCADO", pageWidth / 2, 15, {
        align: "center"
      });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Rhello Flow", pageWidth / 2, 25, {
        align: "center"
      });
      yPos = 50;

      // Informações Gerais
      doc.setTextColor(0, 20, 29);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Informações Gerais", 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Função: ${estudo.funcao}`, 20, yPos);
      yPos += 7;
      doc.text(`Região: ${estudo.regiao}`, 20, yPos);
      yPos += 7;
      if (estudo.senioridade) {
        doc.text(`Senioridade: ${estudo.senioridade}`, 20, yPos);
        yPos += 7;
      }
      if (estudo.tipos_contratacao.length > 0) {
        doc.text(`Tipos de Contratação: ${estudo.tipos_contratacao.join(", ")}`, 20, yPos);
        yPos += 7;
      }
      if (estudo.jornada) {
        doc.text(`Modelo de Trabalho: ${estudo.jornada}`, 20, yPos);
        yPos += 7;
      }
      yPos += 10;

      // Faixa Salarial com destaque
      doc.setFillColor(255, 205, 0);
      doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
      doc.setTextColor(0, 20, 29);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Faixa Salarial", 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      estudo.faixas_salariais.forEach(faixa => {
        if (estudo.faixas_salariais.length > 1) {
          doc.setFont("helvetica", "bold");
          doc.text(faixa.tipo_contratacao, 20, yPos);
          yPos += 7;
          doc.setFont("helvetica", "normal");
        }
        doc.text(`Mínimo: ${formatCurrency(faixa.salario_min)}`, 25, yPos);
        yPos += 6;
        doc.text(`Média: ${formatCurrency(faixa.salario_media)}`, 25, yPos);
        yPos += 6;
        doc.text(`Máximo: ${formatCurrency(faixa.salario_max)}`, 25, yPos);
        yPos += 10;
      });
      if (estudo.salario_ofertado) {
        doc.setFont("helvetica", "bold");
        doc.text("Sua Oferta:", 20, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        doc.text(`Salário${estudo.tipo_contratacao_ofertado ? ` (${estudo.tipo_contratacao_ofertado})` : ""}: ${formatCurrency(estudo.salario_ofertado)}`, 25, yPos);
        yPos += 6;
        doc.text(`Comparação com mercado: ${estudo.comparacao_oferta}`, 25, yPos);
        yPos += 10;
      }

      // Nova página se necessário
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Demanda
      doc.setFillColor(255, 205, 0);
      doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
      doc.setTextColor(0, 20, 29);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Demanda no Mercado", 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(estudo.demanda, 20, yPos);
      yPos += 10;

      // Tendência
      if (estudo.tendencia_short) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFillColor(255, 205, 0);
        doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Tendência", 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const tendenciaLines = doc.splitTextToSize(estudo.tendencia_short, 170);
        doc.text(tendenciaLines, 20, yPos);
        yPos += tendenciaLines.length * 6 + 10;
      }

      // Benefícios
      if (estudo.beneficios.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFillColor(255, 205, 0);
        doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Benefícios Mais Comuns", 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const beneficiosText = doc.splitTextToSize(estudo.beneficios.join(", "), 170);
        doc.text(beneficiosText, 20, yPos);
        yPos += beneficiosText.length * 6 + 10;
      }

      // Fontes
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFillColor(255, 205, 0);
      doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Fontes Consultadas", 20, yPos);
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      estudo.fontes.forEach(fonte => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${fonte.nome}`, 20, yPos);
        yPos += 6;
      });

      // Observações
      if (estudo.observacoes) {
        yPos += 5;
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFillColor(255, 205, 0);
        doc.rect(15, yPos - 5, pageWidth - 30, 8, "F");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Observações", 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const obsLines = doc.splitTextToSize(estudo.observacoes, 170);
        doc.text(obsLines, 20, yPos);
      }

      // Footer em todas as páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(0, 20, 29);
        doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`Gerado por Rhello Flow em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 7, {
          align: "center"
        });
      }

      // Salvar PDF
      const fileName = `estudo-mercado-${estudo.funcao.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };
  return <div className="min-h-screen" style={{
    backgroundColor: '#00141d'
  }}>
      <div className="container mx-auto p-6 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Estudo de Mercado</h1>
          <p className="text-slate-50">Análise objetiva baseada em fontes de mercado</p>
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
              <Input id="funcao" placeholder="Ex: Analista de Customer Success" value={funcao} onChange={e => setFuncao(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regiao">
                Região <span className="text-red-500">*</span>
              </Label>
              <Input id="regiao" placeholder="Ex: São Paulo - SP" value={regiao} onChange={e => setRegiao(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senioridade">Senioridade</Label>
              <Select value={senioridade} onValueChange={setSenioridade}>
                <SelectTrigger id="senioridade">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Júnior">Júnior</SelectItem>
                  <SelectItem value="Pleno" className="text-base">Pleno</SelectItem>
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
              <MultiSelect options={[{
                label: "CLT",
                value: "CLT"
              }, {
                label: "PJ",
                value: "PJ"
              }, {
                label: "Temporário",
                value: "Temporário"
              }, {
                label: "Estágio",
                value: "Estágio"
              }]} value={tiposContratacao} onChange={setTiposContratacao} placeholder="Selecione um ou mais tipos (opcional)" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="salarioOfertado">Salário Ofertado (opcional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="salarioOfertado" type="number" placeholder="Ex: 5000" value={salarioOfertado} onChange={e => setSalarioOfertado(e.target.value)} />
                <Select value={tipoContratacaoOfertado} onValueChange={setTipoContratacaoOfertado} disabled={!salarioOfertado}>
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

          <Button onClick={handleGerarEstudo} disabled={loading} size="lg" className="w-full font-semibold">
            {loading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando estudo...
              </> : "⚡ Gerar Estudo de Mercado"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {estudo && <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary">Resultado do Estudo</h2>
            <Button onClick={handleExportarPDF} variant="outline" size="lg">
              <FileDown className="mr-2 h-5 w-5" />
              Exportar PDF
            </Button>
          </div>

          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Função</p>
                  <p className="font-semibold">{estudo.funcao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Região</p>
                  <p className="font-semibold">{estudo.regiao}</p>
                </div>
                {estudo.senioridade && <div>
                    <p className="text-sm text-muted-foreground">Senioridade</p>
                    <p className="font-semibold">{estudo.senioridade}</p>
                  </div>}
                {estudo.tipos_contratacao.length > 0 && <div>
                    <p className="text-sm text-muted-foreground mb-2">Tipos de Contratação</p>
                    <div className="flex flex-wrap gap-2">
                      {estudo.tipos_contratacao.map((tipo, index) => <Badge key={index} variant="outline">
                          {tipo}
                        </Badge>)}
                    </div>
                  </div>}
                {estudo.jornada && <div>
                    <p className="text-sm text-muted-foreground">Modelo de Trabalho</p>
                    <p className="font-semibold">{estudo.jornada}</p>
                  </div>}
              </div>
            </CardContent>
          </Card>

          {/* Faixa Salarial */}
          <Card>
            <CardHeader>
              <CardTitle>Faixa Salarial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {estudo.faixas_salariais.map((faixa, index) => <div key={index}>
                  {estudo.faixas_salariais.length > 1 && <h3 className="font-semibold text-lg mb-3">{faixa.tipo_contratacao}</h3>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Mínimo</p>
                      <p className="text-2xl font-bold">{formatCurrency(faixa.salario_min)}</p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Média</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(faixa.salario_media)}</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Máximo</p>
                      <p className="text-2xl font-bold">{formatCurrency(faixa.salario_max)}</p>
                    </div>
                  </div>
                  {index < estudo.faixas_salariais.length - 1 && <div className="border-t my-4" />}
                </div>)}

              {estudo.salario_ofertado && <div className="mt-6 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Salário Ofertado{estudo.tipo_contratacao_ofertado ? ` (${estudo.tipo_contratacao_ofertado})` : ''}</p>
                      <p className="text-xl font-bold">{formatCurrency(estudo.salario_ofertado)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getComparacaoIcon(estudo.comparacao_oferta)}
                      <span className="font-semibold">{estudo.comparacao_oferta}</span>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Demanda e Tendência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demanda no Mercado</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`text-lg px-4 py-2 ${getDemandaColor(estudo.demanda)}`}>
                  {estudo.demanda}
                </Badge>
              </CardContent>
            </Card>

            {estudo.tendencia_short && <Card>
                <CardHeader>
                  <CardTitle>Tendência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{estudo.tendencia_short}</p>
                </CardContent>
              </Card>}
          </div>

          {/* Benefícios */}
          {estudo.beneficios.length > 0 && <Card>
              <CardHeader>
                <CardTitle>Benefícios Mais Comuns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {estudo.beneficios.map((beneficio, index) => <Badge key={index} variant="secondary">
                      {beneficio}
                    </Badge>)}
                </div>
              </CardContent>
            </Card>}

          {/* Fontes e Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Fontes e Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fontes Consultadas:</p>
                <div className="flex flex-wrap gap-2">
                  {estudo.fontes.map((fonte, index) => <a key={index} href={fonte.url} target="_blank" rel="noopener noreferrer" className="inline-block">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">
                        {fonte.nome} →
                      </Badge>
                    </a>)}
                </div>
              </div>
              
              {estudo.observacoes && <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{estudo.observacoes}</p>
                </div>}
            </CardContent>
          </Card>
        </div>}
      </div>
    </div>;
}
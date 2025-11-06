import { useState, useRef } from "react";
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
import html2canvas from "html2canvas";

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
  fontes: Array<{ nome: string; url: string }>;
  observacoes: string;
  raw?: object;
}

export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercado | null>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  
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
      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          funcao,
          regiao,
          senioridade: senioridade || null,
          tipos_contratacao: tiposContratacao,
          jornada: jornada || null,
          salario_ofertado: salarioOfertado ? parseFloat(salarioOfertado) : null,
          tipo_contratacao_ofertado: tipoContratacaoOfertado || null,
        },
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
      maximumFractionDigits: 0,
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

  const handleExportarPDF = async () => {
    if (!estudo || !resultadoRef.current) return;

    try {
      toast.info("Gerando PDF...");
      
      // Captura o elemento com o resultado
      const canvas = await html2canvas(resultadoRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#00141d',
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adiciona primeira página
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adiciona páginas adicionais se necessário
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `estudo-mercado-${estudo.funcao.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#00141d' }}>
      <div className="container mx-auto p-6 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">📘 Estudo de Mercado</h1>
          <p className="text-muted-foreground">Análise objetiva baseada em fontes de mercado</p>
        </div>

      {/* Formulário */}
      <Card>
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
              <Label htmlFor="regiao">
                Região <span className="text-red-500">*</span>
              </Label>
              <Input
                id="regiao"
                placeholder="Ex: São Paulo - SP"
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
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
                  { label: "Estágio", value: "Estágio" },
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
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando estudo...
              </>
            ) : (
              "⚡ Gerar Estudo de Mercado"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {estudo && (
        <div ref={resultadoRef} className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary">📊 Resultado do Estudo</h2>
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
              </div>
            </CardContent>
          </Card>

          {/* Faixa Salarial */}
          <Card>
            <CardHeader>
              <CardTitle>Faixa Salarial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {estudo.faixas_salariais.map((faixa, index) => (
                <div key={index}>
                  {estudo.faixas_salariais.length > 1 && (
                    <h3 className="font-semibold text-lg mb-3">{faixa.tipo_contratacao}</h3>
                  )}
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
                  {index < estudo.faixas_salariais.length - 1 && (
                    <div className="border-t my-4" />
                  )}
                </div>
              ))}

              {estudo.salario_ofertado && (
                <div className="mt-6 p-4 border rounded-lg">
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
                </div>
              )}
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

            {estudo.tendencia_short && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{estudo.tendencia_short}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Benefícios */}
          {estudo.beneficios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefícios Mais Comuns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {estudo.beneficios.map((beneficio, index) => (
                    <Badge key={index} variant="secondary">
                      {beneficio}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fontes e Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Fontes e Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fontes Consultadas:</p>
                <div className="flex flex-wrap gap-2">
                  {estudo.fontes.map((fonte, index) => (
                    <a
                      key={index}
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        {fonte.nome} →
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
              
              {estudo.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{estudo.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}

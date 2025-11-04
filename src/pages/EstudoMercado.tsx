import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, EyeOff, TrendingUp, Users, Clock, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EstudoMercado {
  faixa_salarial: {
    junior: { min: number | null; med: number | null; max: number | null; fontes: string[] };
    pleno: { min: number | null; med: number | null; max: number | null; fontes: string[] };
    senior: { min: number | null; med: number | null; max: number | null; fontes: string[] };
  };
  beneficios: {
    recorrentes: string[];
    diferenciais: string[];
  };
  concorrencia: "Alta" | "Média" | "Baixa";
  tendencias: string[];
  dificuldade: {
    nivel: "Alta" | "Média" | "Baixa";
    tempo_medio_dias: number | null;
  };
  comparativo: {
    cliente: { salario: number | null; modelo: string | null; beneficios: string[] | null };
    mercado: { salario_med_pleno: number | null; modelo_pred: string | null; beneficios_mais_comuns: string[] | null };
    atratividade: "Alta" | "Média" | "Baixa";
  };
  recomendacoes: string[];
  metodologia: {
    periodo: string;
    fontes: string[];
    observacoes: string;
  };
}

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const FONTES = [
  "Base Rhello",
  "Relatórios Oficiais",
  "LinkedIn Salaries",
  "Glassdoor",
  "Vagas.com"
];

export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercado | null>(null);
  
  // Form state
  const [funcao, setFuncao] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [modelo, setModelo] = useState("");
  const [setor, setSetor] = useState("");
  const [porte, setPorte] = useState("");
  const [fontesSelecionadas, setFontesSelecionadas] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [salarioCliente, setSalarioCliente] = useState("");
  const [beneficiosCliente, setBeneficiosCliente] = useState("");

  const handleGerarEstudo = async () => {
    if (!funcao || !cidade || !uf) {
      toast.error("Preencha os campos obrigatórios: Função, Cidade e Estado");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          funcao,
          senioridade,
          localizacao: { cidade, uf, modelo },
          setor,
          porte,
          fontes: fontesSelecionadas,
          observacoes,
          cliente: {
            salario: salarioCliente ? parseFloat(salarioCliente) : null,
            modelo,
            beneficios: beneficiosCliente ? beneficiosCliente.split(",").map(b => b.trim()) : null,
          },
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
      toast.error("Erro ao gerar estudo de mercado");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">📘 Estudo de Mercado – Rhello RH</h1>
        <p className="text-muted-foreground">Gere insights de mercado com base no Discovery</p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Vaga</CardTitle>
          <CardDescription>Preencha os dados para gerar o estudo de mercado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="funcao">Função *</Label>
              <Input
                id="funcao"
                placeholder="Ex: Analista de Customer Success"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senioridade">Senioridade</Label>
              <Select value={senioridade} onValueChange={setSenioridade}>
                <SelectTrigger id="senioridade">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Pleno">Pleno</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Coordenacao">Coordenação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                placeholder="Ex: São Paulo"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">Estado *</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger id="uf">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo de Trabalho</Label>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger id="modelo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Hibrido">Híbrido</SelectItem>
                  <SelectItem value="Remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setor">Setor de Atuação</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger id="setor">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="Industria">Indústria</SelectItem>
                  <SelectItem value="Servicos">Serviços</SelectItem>
                  <SelectItem value="Educacao">Educação</SelectItem>
                  <SelectItem value="Varejo">Varejo</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porte">Porte da Empresa</Label>
              <Select value={porte} onValueChange={setPorte}>
                <SelectTrigger id="porte">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Startup">Startup</SelectItem>
                  <SelectItem value="PME">PME</SelectItem>
                  <SelectItem value="Corporativo">Corporativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salarioCliente">Salário Proposto (Cliente)</Label>
              <Input
                id="salarioCliente"
                type="number"
                placeholder="Ex: 5000"
                value={salarioCliente}
                onChange={(e) => setSalarioCliente(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fontes Sugeridas</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FONTES.map((fonte) => (
                <div key={fonte} className="flex items-center space-x-2">
                  <Checkbox
                    id={fonte}
                    checked={fontesSelecionadas.includes(fonte)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFontesSelecionadas([...fontesSelecionadas, fonte]);
                      } else {
                        setFontesSelecionadas(fontesSelecionadas.filter((f) => f !== fonte));
                      }
                    }}
                  />
                  <Label htmlFor={fonte} className="cursor-pointer">
                    {fonte}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiosCliente">Benefícios (Cliente) - separados por vírgula</Label>
            <Input
              id="beneficiosCliente"
              placeholder="Ex: Vale transporte, Vale refeição, Plano de saúde"
              value={beneficiosCliente}
              onChange={(e) => setBeneficiosCliente(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Discovery</Label>
            <Textarea
              id="observacoes"
              placeholder="Ex: Cliente quer perfil B2B, experiência com Salesforce e autonomia alta"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
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
        <div className="space-y-6 animate-in fade-in duration-500">
          <h2 className="text-2xl font-bold text-primary">📊 Resultado do Estudo de Mercado</h2>

          {/* Faixa Salarial */}
          <Card>
            <CardHeader>
              <CardTitle>Faixa Salarial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nível</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Máximo</TableHead>
                    <TableHead>Fontes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Júnior</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.junior?.min)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.junior?.med)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.junior?.max)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {estudo.faixa_salarial.junior?.fontes?.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Pleno</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.pleno?.min)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.pleno?.med)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.pleno?.max)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {estudo.faixa_salarial.pleno?.fontes?.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Sênior</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.senior?.min)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.senior?.med)}</TableCell>
                    <TableCell>{formatCurrency(estudo.faixa_salarial.senior?.max)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {estudo.faixa_salarial.senior?.fontes?.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      nivel: "Júnior",
                      Mínimo: estudo.faixa_salarial.junior?.min || 0,
                      Média: estudo.faixa_salarial.junior?.med || 0,
                      Máximo: estudo.faixa_salarial.junior?.max || 0,
                    },
                    {
                      nivel: "Pleno",
                      Mínimo: estudo.faixa_salarial.pleno?.min || 0,
                      Média: estudo.faixa_salarial.pleno?.med || 0,
                      Máximo: estudo.faixa_salarial.pleno?.max || 0,
                    },
                    {
                      nivel: "Sênior",
                      Mínimo: estudo.faixa_salarial.senior?.min || 0,
                      Média: estudo.faixa_salarial.senior?.med || 0,
                      Máximo: estudo.faixa_salarial.senior?.max || 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nivel" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="Mínimo" fill="hsl(var(--primary))" />
                  <Bar dataKey="Média" fill="hsl(var(--accent))" />
                  <Bar dataKey="Máximo" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Concorrência e Dificuldade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Concorrência no Mercado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{estudo.concorrencia}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Dificuldade de Contratação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{estudo.dificuldade.nivel}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tempo médio: {estudo.dificuldade.tempo_medio_dias || "—"} dias
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Comparativo Cliente × Mercado */}
          <Card>
            <CardHeader>
              <CardTitle>Comparativo Cliente × Mercado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Elemento</TableHead>
                    <TableHead>Vaga Cliente</TableHead>
                    <TableHead>Mercado</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Faixa (Pleno/média)</TableCell>
                    <TableCell>{formatCurrency(estudo.comparativo.cliente?.salario)}</TableCell>
                    <TableCell>{formatCurrency(estudo.comparativo.mercado?.salario_med_pleno)}</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Modelo de trabalho</TableCell>
                    <TableCell>{estudo.comparativo.cliente?.modelo || "—"}</TableCell>
                    <TableCell>{estudo.comparativo.mercado?.modelo_pred || "—"}</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Benefícios</TableCell>
                    <TableCell>{estudo.comparativo.cliente?.beneficios?.join(", ") || "—"}</TableCell>
                    <TableCell>{estudo.comparativo.mercado?.beneficios_mais_comuns?.join(", ") || "—"}</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Atratividade</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="font-semibold">{estudo.comparativo.atratividade}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recomendações */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Recomendações Rhello</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {estudo.recomendacoes.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-accent font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Tendências */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Tendências e Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{estudo.tendencias.join(" • ")}</p>
            </CardContent>
          </Card>

          {/* Metodologia */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Período:</strong> {estudo.metodologia?.periodo || "—"} |{" "}
                <strong>Fontes:</strong> {estudo.metodologia?.fontes?.join(", ") || "—"} |{" "}
                <strong>Obs.:</strong> {estudo.metodologia?.observacoes || "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!estudo && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Preencha as informações acima e clique em Gerar Estudo para visualizar os dados de mercado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
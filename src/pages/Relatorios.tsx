import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Target, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";

// Utility functions
const formatInt = (n: number): string => Math.round(n).toString();
const formatPercent = (n: number): string => `${Math.round(n)}%`;

// Color palette Rhello
const COLORS = {
  primary: "#FFCD00",
  secondary: "#FAEC3E",
  dark: "#00141D",
  gray: "#36404A",
  cream: "#FFFDF6",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f97316",
  purple: "#8b5cf6",
  blue: "#3b82f6",
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.orange, COLORS.purple, COLORS.blue, COLORS.gray];

interface SummaryStats {
  totalVagas: number;
  mediaFechamento: number;
  percentForaSLA: number;
  percentAprovacao: number;
  percentFeedbacksPendentes: number;
}

interface VagasTimeData {
  semana: string;
  abertas: number;
  fechadas: number;
}

interface RecrutadorAvgData {
  recrutador: string;
  media_dias: number;
}

interface FunilData {
  etapa: string;
  qtd: number;
}

interface AreaData {
  area: string;
  total: number;
}

interface SLAData {
  media_dias_uteis: number;
}

const SummaryCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "text-foreground" 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: "up" | "down"; 
  color?: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-[28px] font-semibold ${color}`}>{value}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Icon className={`h-6 w-6 ${color}`} />
          {trend && (
            trend === "up" ? 
              <TrendingUp className="h-4 w-4 text-green-500" /> : 
              <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ChartCard = ({ 
  title, 
  children, 
  onRefresh 
}: { 
  title: string; 
  children: React.ReactNode; 
  onRefresh: () => void;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default function Relatorios() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("30");
  const [recrutadorFilter, setRecrutadorFilter] = useState("todos");
  const [clienteFilter, setClienteFilter] = useState("todos");
  
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalVagas: 0,
    mediaFechamento: 0,
    percentForaSLA: 0,
    percentAprovacao: 0,
    percentFeedbacksPendentes: 0,
  });
  
  const [vagasTimeData, setVagasTimeData] = useState<VagasTimeData[]>([]);
  const [recrutadorAvgData, setRecrutadorAvgData] = useState<RecrutadorAvgData[]>([]);
  const [funilData, setFunilData] = useState<FunilData[]>([]);
  const [areaData, setAreaData] = useState<AreaData[]>([]);
  const [slaData, setSlaData] = useState<SLAData>({ media_dias_uteis: 0 });

  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  useEffect(() => {
    loadAllData();
  }, [periodFilter, recrutadorFilter, clienteFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSummaryStats(),
        loadVagasTimeData(),
        loadRecrutadorAvgData(),
        loadFunilData(),
        loadAreaData(),
        loadSLAData(),
        loadFiltersData(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const { data: vagasData } = await supabase
        .from("vagas")
        .select("recrutador, empresa");

      const uniqueRecrutadores = Array.from(new Set(vagasData?.map(v => v.recrutador).filter(Boolean))) as string[];
      const uniqueClientes = Array.from(new Set(vagasData?.map(v => v.empresa).filter(Boolean))) as string[];
      
      setRecrutadores(uniqueRecrutadores);
      setClientes(uniqueClientes);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
    }
  };

  const loadSummaryStats = async () => {
    try {
      // Total de vagas
      let query = supabase
        .from("vagas")
        .select("*", { count: "exact" })
        .gte("criado_em", `now() - interval '${periodFilter} days'`);

      if (recrutadorFilter !== "todos") {
        query = query.eq("recrutador", recrutadorFilter);
      }
      if (clienteFilter !== "todos") {
        query = query.eq("empresa", clienteFilter);
      }

      const { count: totalVagas } = await query;

      // Média de fechamento
      const { data: fechamentoData } = await supabase
        .from("vagas")
        .select("criado_em, status_changed_at")
        .eq("status", "Concluído")
        .not("status_changed_at", "is", null)
        .gte("criado_em", `now() - interval '${periodFilter} days'`);

      const mediaFechamento = fechamentoData && fechamentoData.length > 0
        ? fechamentoData.reduce((acc, v) => {
            const diff = new Date(v.status_changed_at).getTime() - new Date(v.criado_em).getTime();
            return acc + diff / (1000 * 60 * 60 * 24);
          }, 0) / fechamentoData.length
        : 0;

      // % fora do SLA (>30 dias)
      const { data: foraSLAData } = await supabase
        .from("vagas")
        .select("criado_em")
        .not("status", "in", '("Concluído","Cancelada")')
        .gte("criado_em", `now() - interval '${periodFilter} days'`);

      const foraSLA = foraSLAData?.filter(v => {
        const diff = Date.now() - new Date(v.criado_em).getTime();
        return diff > 30 * 24 * 60 * 60 * 1000;
      }).length || 0;

      const percentForaSLA = totalVagas ? (foraSLA / totalVagas) * 100 : 0;

      // Taxa de aprovação
      const { data: historicoData } = await supabase
        .from("historico_candidatos")
        .select("resultado")
        .gte("data", `now() - interval '${periodFilter} days'`)
        .in("resultado", ["Aprovado", "Reprovado", "Contratado"]);

      const totalProcessos = historicoData?.length || 0;
      const aprovados = historicoData?.filter(h => h.resultado === "Contratado").length || 0;
      const percentAprovacao = totalProcessos ? (aprovados / totalProcessos) * 100 : 0;

      // Feedbacks pendentes
      const { data: candidatosData } = await supabase
        .from("candidatos")
        .select("id, ultimo_feedback")
        .eq("status", "Entrevistas Solicitante");

      const pendentes = candidatosData?.length || 0;
      const percentFeedbacksPendentes = totalVagas ? (pendentes / totalVagas) * 100 : 0;

      setSummaryStats({
        totalVagas: totalVagas || 0,
        mediaFechamento,
        percentForaSLA,
        percentAprovacao,
        percentFeedbacksPendentes,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadVagasTimeData = async () => {
    try {
      const { data: vagasData } = await supabase
        .from("vagas")
        .select("criado_em, status, status_changed_at")
        .gte("criado_em", `now() - interval '${periodFilter} days'`);

      const weeklyData: Record<string, { abertas: number; fechadas: number }> = {};

      vagasData?.forEach(v => {
        const week = new Date(v.criado_em).toISOString().slice(0, 10);
        if (!weeklyData[week]) weeklyData[week] = { abertas: 0, fechadas: 0 };
        
        if (v.status !== "Concluído" && v.status !== "Cancelada") {
          weeklyData[week].abertas++;
        }
        if (v.status === "Concluído" && v.status_changed_at) {
          const closedWeek = new Date(v.status_changed_at).toISOString().slice(0, 10);
          if (!weeklyData[closedWeek]) weeklyData[closedWeek] = { abertas: 0, fechadas: 0 };
          weeklyData[closedWeek].fechadas++;
        }
      });

      const formattedData = Object.entries(weeklyData)
        .map(([semana, values]) => ({
          semana: new Date(semana).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
          ...values,
        }))
        .sort((a, b) => a.semana.localeCompare(b.semana));

      setVagasTimeData(formattedData);
    } catch (error) {
      console.error("Erro ao carregar dados de tempo:", error);
    }
  };

  const loadRecrutadorAvgData = async () => {
    try {
      const { data } = await supabase
        .from("vagas")
        .select("recrutador, criado_em, status_changed_at")
        .eq("status", "Concluído")
        .not("status_changed_at", "is", null)
        .not("recrutador", "is", null);

      const recrutadorMap: Record<string, { total: number; count: number }> = {};

      data?.forEach(v => {
        if (!v.recrutador) return;
        const diff = new Date(v.status_changed_at).getTime() - new Date(v.criado_em).getTime();
        const dias = diff / (1000 * 60 * 60 * 24);

        if (!recrutadorMap[v.recrutador]) {
          recrutadorMap[v.recrutador] = { total: 0, count: 0 };
        }
        recrutadorMap[v.recrutador].total += dias;
        recrutadorMap[v.recrutador].count++;
      });

      const formattedData = Object.entries(recrutadorMap)
        .map(([recrutador, { total, count }]) => ({
          recrutador,
          media_dias: Math.round(total / count),
        }))
        .sort((a, b) => b.media_dias - a.media_dias);

      setRecrutadorAvgData(formattedData);
    } catch (error) {
      console.error("Erro ao carregar dados de recrutadores:", error);
    }
  };

  const loadFunilData = async () => {
    try {
      const { data } = await supabase
        .from("candidatos")
        .select("status")
        .gte("criado_em", `now() - interval '60 days'`);

      const statusMap: Record<string, number> = {};
      data?.forEach(c => {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      });

      const formattedData = Object.entries(statusMap)
        .map(([etapa, qtd]) => ({ etapa, qtd }))
        .sort((a, b) => b.qtd - a.qtd);

      setFunilData(formattedData);
    } catch (error) {
      console.error("Erro ao carregar dados do funil:", error);
    }
  };

  const loadAreaData = async () => {
    try {
      const { data } = await supabase
        .from("candidatos")
        .select("area");

      const areaMap: Record<string, number> = {};
      data?.forEach(c => {
        if (c.area) {
          areaMap[c.area] = (areaMap[c.area] || 0) + 1;
        }
      });

      const formattedData = Object.entries(areaMap)
        .map(([area, total]) => ({ area, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6); // Top 6

      setAreaData(formattedData);
    } catch (error) {
      console.error("Erro ao carregar dados de área:", error);
    }
  };

  const loadSLAData = async () => {
    try {
      const { data } = await supabase
        .from("vagas")
        .select("criado_em, status_changed_at")
        .not("status", "in", '("Cancelada")');

      let totalDias = 0;
      let count = 0;

      data?.forEach(v => {
        const end = v.status_changed_at ? new Date(v.status_changed_at) : new Date();
        const start = new Date(v.criado_em);
        const diff = end.getTime() - start.getTime();
        const dias = diff / (1000 * 60 * 60 * 24);
        
        totalDias += dias;
        count++;
      });

      const media = count > 0 ? totalDias / count : 0;
      setSlaData({ media_dias_uteis: Math.round(media * 0.71) }); // Aproximação de dias úteis
    } catch (error) {
      console.error("Erro ao carregar dados de SLA:", error);
    }
  };

  const getSLAColor = (dias: number) => {
    if (dias <= 20) return COLORS.green;
    if (dias <= 30) return COLORS.primary;
    return COLORS.red;
  };

  const getSLAStatus = (dias: number) => {
    if (dias <= 20) return "Ótimo";
    if (dias <= 30) return "Atenção";
    return "Crítico";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 md:px-8 py-6 max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[32px] font-bold text-foreground mb-1">Relatórios</h1>
              <p className="text-[18px] text-muted-foreground">
                Indicadores de performance e produtividade
              </p>
            </div>
            
            {/* Filtros globais */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={recrutadorFilter} onValueChange={setRecrutadorFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Recrutador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os recrutadores</SelectItem>
                  {recrutadores.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-8 max-w-[1600px] mx-auto space-y-8">
        {/* Cards de resumo */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            title="Total de Vagas"
            value={formatInt(summaryStats.totalVagas)}
            icon={TrendingUp}
            color="text-primary"
          />
          <SummaryCard
            title="Média de Fechamento"
            value={`${formatInt(summaryStats.mediaFechamento)}d`}
            icon={Clock}
            color="text-blue-600"
          />
          <SummaryCard
            title="% Fora do SLA"
            value={formatPercent(summaryStats.percentForaSLA)}
            icon={AlertCircle}
            color="text-orange-600"
            trend={summaryStats.percentForaSLA > 20 ? "up" : "down"}
          />
          <SummaryCard
            title="% Aprovação"
            value={formatPercent(summaryStats.percentAprovacao)}
            icon={Target}
            color="text-green-600"
            trend={summaryStats.percentAprovacao > 50 ? "up" : "down"}
          />
          <SummaryCard
            title="% Feedbacks Pendentes"
            value={formatPercent(summaryStats.percentFeedbacksPendentes)}
            icon={AlertCircle}
            color="text-purple-600"
          />
        </div>

        {/* Gráfico 1: Vagas abertas e fechadas */}
        <ChartCard 
          title="Vagas Abertas vs Fechadas (Últimos 90 dias)" 
          onRefresh={loadVagasTimeData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={vagasTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis dataKey="semana" stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <YAxis stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
                labelStyle={{ color: COLORS.dark, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Area 
                type="monotone" 
                dataKey="abertas" 
                stackId="1" 
                stroke={COLORS.primary} 
                fill={COLORS.primary} 
                fillOpacity={0.6}
                name="Abertas"
              />
              <Area 
                type="monotone" 
                dataKey="fechadas" 
                stackId="2" 
                stroke={COLORS.green} 
                fill={COLORS.green} 
                fillOpacity={0.6}
                name="Fechadas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gráfico 2: Tempo médio por recrutador */}
        <ChartCard 
          title="Tempo Médio de Fechamento por Recrutador" 
          onRefresh={loadRecrutadorAvgData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recrutadorAvgData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis type="number" stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <YAxis dataKey="recrutador" type="category" stroke={COLORS.gray} style={{ fontSize: 12 }} width={120} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
                formatter={(value: any) => [`${value} dias`, "Média"]}
              />
              <Bar 
                dataKey="media_dias" 
                fill={COLORS.primary}
                radius={[0, 8, 8, 0]}
                onClick={(data) => navigate(`/vagas?recrutador=${encodeURIComponent(data.recrutador)}`)}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gráfico 3: Funil de aprovação */}
        <ChartCard 
          title="Taxa de Aprovação por Etapa" 
          onRefresh={loadFunilData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funilData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis dataKey="etapa" stroke={COLORS.gray} style={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
              />
              <Bar 
                dataKey="qtd" 
                fill={COLORS.secondary}
                radius={[8, 8, 0, 0]}
                onClick={(data) => navigate(`/candidatos?etapa=${encodeURIComponent(data.etapa)}`)}
                style={{ cursor: "pointer" }}
              >
                {funilData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gráfico 4: Distribuição por área */}
          <ChartCard 
            title="Distribuição de Candidatos por Área" 
            onRefresh={loadAreaData}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={areaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ area, percent }) => `${area}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill={COLORS.primary}
                  dataKey="total"
                >
                  {areaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Gráfico 5: SLA Gauge */}
          <ChartCard 
            title="SLA de Vagas (Tempo Real)" 
            onRefresh={loadSLAData}
          >
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div 
                className="relative w-48 h-48 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${getSLAColor(slaData.media_dias_uteis)} ${(slaData.media_dias_uteis / 45) * 360}deg, ${COLORS.gray}20 0deg)`,
                }}
              >
                <div className="absolute inset-4 bg-background rounded-full flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold" style={{ color: getSLAColor(slaData.media_dias_uteis) }}>
                    {slaData.media_dias_uteis}
                  </p>
                  <p className="text-sm text-muted-foreground">dias úteis</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-lg font-semibold" style={{ color: getSLAColor(slaData.media_dias_uteis) }}>
                  {getSLAStatus(slaData.media_dias_uteis)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {slaData.media_dias_uteis <= 20 && "Dentro do prazo ideal"}
                  {slaData.media_dias_uteis > 20 && slaData.media_dias_uteis <= 30 && "Próximo ao limite"}
                  {slaData.media_dias_uteis > 30 && "Acima do SLA de 30 dias úteis"}
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
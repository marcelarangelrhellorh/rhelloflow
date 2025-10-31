import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Target, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

interface ReportsData {
  summary: {
    vagas_abertas: number;
    candidatos_ativos: number;
    vagas_atencao: number;
    ids_vagas_atencao: string[];
    media_dias_fechamento: number;
    taxa_aprovacao: number;
    feedbacks_pendentes: number;
  };
  series_open_closed: Array<{
    week: string;
    opened: number;
    closed: number;
  }>;
  avg_time_by_recruiter: Array<{
    recruiter: string;
    avg_days: number;
  }>;
  funnel_by_stage: Array<{
    stage: string;
    count: number;
  }>;
  candidates_by_area: Array<{
    area: string;
    total: number;
  }>;
  sla: {
    avg_business_days: number;
    limit: number;
  };
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
  
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  useEffect(() => {
    loadAllData();
  }, [periodFilter, recrutadorFilter, clienteFilter]);

  useEffect(() => {
    loadFiltersData();
  }, []);

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

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Calcular datas com base no filtro de período
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(periodFilter));

      const { data, error } = await supabase.rpc('reports_overview', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        recrutador_param: recrutadorFilter === "todos" ? null : recrutadorFilter,
        cliente_param: clienteFilter === "todos" ? null : clienteFilter,
      });

      if (error) {
        console.error("Erro ao carregar relatórios:", error);
        toast.error("Erro ao carregar dados dos relatórios");
        throw error;
      }

      setReports(data as unknown as ReportsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
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

  if (!reports) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Erro ao carregar relatórios</p>
          <Button onClick={loadAllData}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const summary = reports.summary;
  const sla = reports.sla;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner de construção */}
      <div className="bg-[#F9EC3F] border-b-2 border-[#E5D72E]">
        <div className="px-6 md:px-8 py-3 max-w-[1600px] mx-auto">
          <p className="text-center text-[#00141D] font-semibold text-sm">
            🚧 Página em construção - Alguns recursos ainda estão sendo desenvolvidos
          </p>
        </div>
      </div>

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
            value={formatInt(summary.vagas_abertas)}
            icon={TrendingUp}
            color="text-primary"
          />
          <SummaryCard
            title="Média de Fechamento"
            value={`${formatInt(summary.media_dias_fechamento)}d`}
            icon={Clock}
            color="text-blue-600"
          />
          <SummaryCard
            title="Vagas com Atenção"
            value={formatInt(summary.vagas_atencao)}
            icon={AlertCircle}
            color="text-orange-600"
            trend={summary.vagas_atencao > 0 ? "up" : "down"}
          />
          <SummaryCard
            title="Taxa de Aprovação"
            value={formatPercent(summary.taxa_aprovacao)}
            icon={Target}
            color="text-green-600"
            trend={summary.taxa_aprovacao > 50 ? "up" : "down"}
          />
          <SummaryCard
            title="Feedbacks Pendentes"
            value={formatInt(summary.feedbacks_pendentes)}
            icon={AlertCircle}
            color="text-purple-600"
          />
        </div>

        {/* Gráfico 1: Vagas abertas e fechadas */}
        <ChartCard 
          title="Vagas Abertas vs Fechadas" 
          onRefresh={loadAllData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reports.series_open_closed}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis dataKey="week" stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <YAxis stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
                labelStyle={{ color: COLORS.dark, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Area 
                type="monotone" 
                dataKey="opened" 
                stackId="1" 
                stroke={COLORS.primary} 
                fill={COLORS.primary} 
                fillOpacity={0.6}
                name="Abertas"
              />
              <Area 
                type="monotone" 
                dataKey="closed" 
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
          onRefresh={loadAllData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reports.avg_time_by_recruiter} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis type="number" stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <YAxis dataKey="recruiter" type="category" stroke={COLORS.gray} style={{ fontSize: 12 }} width={120} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
                formatter={(value: any) => [`${value} dias`, "Média"]}
              />
              <Bar 
                dataKey="avg_days" 
                fill={COLORS.primary}
                radius={[0, 8, 8, 0]}
                onClick={(data) => navigate(`/vagas?recrutador=${encodeURIComponent(data.recruiter)}`)}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gráfico 3: Funil de aprovação */}
        <ChartCard 
          title="Distribuição por Etapa do Funil" 
          onRefresh={loadAllData}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reports.funnel_by_stage}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray} opacity={0.1} />
              <XAxis dataKey="stage" stroke={COLORS.gray} style={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke={COLORS.gray} style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.gray}` }}
              />
              <Bar 
                dataKey="count" 
                fill={COLORS.secondary}
                radius={[8, 8, 0, 0]}
                onClick={(data) => navigate(`/candidatos?status=${encodeURIComponent(data.stage)}`)}
                style={{ cursor: "pointer" }}
              >
                {reports.funnel_by_stage.map((entry, index) => (
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
            onRefresh={loadAllData}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reports.candidates_by_area}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ area, percent }) => `${area}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill={COLORS.primary}
                  dataKey="total"
                >
                  {reports.candidates_by_area.map((entry, index) => (
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
            onRefresh={loadAllData}
          >
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div 
                className="relative w-48 h-48 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${getSLAColor(sla.avg_business_days)} ${(sla.avg_business_days / 45) * 360}deg, ${COLORS.gray}20 0deg)`,
                }}
              >
                <div className="absolute inset-4 bg-background rounded-full flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold" style={{ color: getSLAColor(sla.avg_business_days) }}>
                    {formatInt(sla.avg_business_days)}
                  </p>
                  <p className="text-sm text-muted-foreground">dias úteis</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-lg font-semibold" style={{ color: getSLAColor(sla.avg_business_days) }}>
                  {getSLAStatus(sla.avg_business_days)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sla.avg_business_days <= 20 && "Dentro do prazo ideal"}
                  {sla.avg_business_days > 20 && sla.avg_business_days <= 30 && "Próximo ao limite"}
                  {sla.avg_business_days > 30 && "Acima do SLA de 30 dias úteis"}
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
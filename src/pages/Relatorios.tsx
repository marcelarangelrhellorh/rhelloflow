import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, FileDown, Briefcase, Users, Clock, AlertTriangle, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface KPIData {
  vagas_abertas: number;
  candidatos_novos: number;
  contratacoes: number;
  time_to_hire_avg: number;
  sla_violations_count: number;
  banco_count: number;
}

interface TimePerStage {
  stage: string;
  avg_days: number;
}

interface OriginPerformance {
  origem: string;
  total: number;
}

interface RecruiterPerformance {
  recrutador_nome: string;
  vagas: number;
  candidatos: number;
  contratacoes: number;
  avg_time_to_hire: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

const KPISkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-20" />
        </div>
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

const KPICard = ({ title, value, icon, iconBgColor }: KPICardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm text-muted-foreground font-semibold">{title}</p>
          <p className="text-4xl font-bold">{value}</p>
        </div>
        <div className={`rounded-full p-4 ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [timePerStage, setTimePerStage] = useState<TimePerStage[]>([]);
  const [originData, setOriginData] = useState<OriginPerformance[]>([]);
  const [recruiterData, setRecruiterData] = useState<RecruiterPerformance[]>([]);
  const [overdueJobs, setOverdueJobs] = useState<any[]>([]);
  
  // Filtros
  const [dateFrom, setDateFrom] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>("all");
  const [selectedCS, setSelectedCS] = useState<string>("all");
  const [recruiters, setRecruiters] = useState<any[]>([]);

  useEffect(() => {
    loadRecruiters();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, selectedRecruiter, selectedCS]);

  const loadRecruiters = async () => {
    try {
      // Buscar usuários que têm role de recrutador ou CS
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["recrutador", "cs"]);
      
      if (!userRoles || userRoles.length === 0) {
        setRecruiters([]);
        return;
      }

      const userIds = [...new Set(userRoles.map(ur => ur.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
        .order("full_name");
      
      if (profiles) setRecruiters(profiles);
    } catch (error) {
      console.error("Error loading recruiters:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        loadTimePerStage(),
        loadOriginPerformance(),
        loadRecruiterPerformance(),
        loadOverdueJobs()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados dos relatórios");
    } finally {
      setLoading(false);
    }
  };

  const loadKPIs = async () => {
    let query = supabase
      .from("vagas")
      .select("id, status, criado_em");
    
    const { data: vagas } = await query;
    
    let candidatosQuery = supabase
      .from("candidatos")
      .select("id, status, criado_em")
      .gte("criado_em", dateFrom)
      .lte("criado_em", dateTo);
    
    const { data: candidatos } = await candidatosQuery;

    const { data: bancoTalentos } = await supabase
      .from("candidatos")
      .select("id")
      .eq("disponibilidade_status", "disponível");

    const vagasAbertas = vagas?.filter(v => 
      !['Concluída', 'Cancelada', 'Pausada'].includes(v.status || '')
    ).length || 0;

    const candidatosNovos = candidatos?.length || 0;
    const contratacoes = candidatos?.filter(c => c.status === 'Contratado').length || 0;

    // Time to hire simplificado
    const hiredCandidates = candidatos?.filter(c => c.status === 'Contratado') || [];
    const avgTimeToHire = hiredCandidates.length > 0 
      ? hiredCandidates.reduce((acc, c) => {
          const days = Math.floor((new Date().getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24));
          return acc + days;
        }, 0) / hiredCandidates.length
      : 0;

    // SLA violations (vagas > 30 dias)
    const slaViolations = vagas?.filter(v => {
      if (['Concluída', 'Cancelada'].includes(v.status || '')) return false;
      const days = Math.floor((new Date().getTime() - new Date(v.criado_em).getTime()) / (1000 * 60 * 60 * 24));
      return days > 30;
    }).length || 0;

    setKpiData({
      vagas_abertas: vagasAbertas,
      candidatos_novos: candidatosNovos,
      contratacoes: contratacoes,
      time_to_hire_avg: Math.round(avgTimeToHire),
      sla_violations_count: slaViolations,
      banco_count: bancoTalentos?.length || 0
    });
  };

  const loadTimePerStage = async () => {
    // Simplificado - baseado em status atual dos candidatos
    const { data: candidatos } = await supabase
      .from("candidatos")
      .select("status, criado_em")
      .gte("criado_em", dateFrom)
      .lte("criado_em", dateTo);

    if (!candidatos) return;

    const stageGroups: Record<string, number[]> = {};
    candidatos.forEach(c => {
      const status = c.status || 'Outros';
      const days = Math.floor((new Date().getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24));
      if (!stageGroups[status]) stageGroups[status] = [];
      stageGroups[status].push(days);
    });

    const avgPerStage = Object.entries(stageGroups)
      .map(([stage, days]) => ({
        stage,
        avg_days: Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      }))
      .sort((a, b) => b.avg_days - a.avg_days)
      .slice(0, 8);

    setTimePerStage(avgPerStage);
  };

  const loadOriginPerformance = async () => {
    const { data } = await supabase
      .from("candidatos")
      .select("origem")
      .gte("criado_em", dateFrom)
      .lte("criado_em", dateTo);

    if (!data) return;

    const originCounts: Record<string, number> = {};
    data.forEach(c => {
      const origin = c.origem || 'Não especificado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });

    const originArray = Object.entries(originCounts)
      .map(([origem, total]) => ({ origem, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    setOriginData(originArray);
  };

  const loadRecruiterPerformance = async () => {
    try {
      // Buscar vagas no período
      const { data: vagas, error: vagasError } = await supabase
        .from("vagas")
        .select("id, recrutador_id, criado_em")
        .gte("criado_em", dateFrom)
        .lte("criado_em", dateTo)
        .not("recrutador_id", "is", null);

      if (vagasError) {
        console.error("Erro ao carregar vagas para performance:", vagasError);
        setRecruiterData([]);
        return;
      }

      if (!vagas || vagas.length === 0) {
        setRecruiterData([]);
        return;
      }

      // Buscar todos os profiles dos recrutadores únicos
      const recruiterIds = [...new Set(vagas.map(v => v.recrutador_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", recruiterIds);

      if (profilesError) {
        console.error("Erro ao carregar profiles:", profilesError);
      }

      // Criar um mapa de id -> nome
      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const { data: candidatos, error: candidatosError } = await supabase
        .from("candidatos")
        .select("id, status, vaga_relacionada_id, criado_em")
        .gte("criado_em", dateFrom)
        .lte("criado_em", dateTo);

      if (candidatosError) {
        console.error("Erro ao carregar candidatos para performance:", candidatosError);
      }

    const recruiterStats: Record<string, any> = {};

    vagas.forEach(v => {
      const recruiterId = v.recrutador_id;
      if (!recruiterId) return;
      
      const recruiterName = profilesMap.get(recruiterId) || 'Sem nome';
      
      if (!recruiterStats[recruiterId]) {
        recruiterStats[recruiterId] = {
          recrutador_nome: recruiterName,
          vagas: 0,
          candidatos: 0,
          contratacoes: 0,
          total_days: 0,
          hired_count: 0
        };
      }
      
      recruiterStats[recruiterId].vagas++;
    });

    candidatos?.forEach(c => {
      const vaga = vagas.find(v => v.id === c.vaga_relacionada_id);
      if (!vaga?.recrutador_id) return;
      
      const recruiterId = vaga.recrutador_id;
      if (recruiterStats[recruiterId]) {
        recruiterStats[recruiterId].candidatos++;
        
        if (c.status === 'Contratado') {
          recruiterStats[recruiterId].contratacoes++;
          const days = Math.floor((new Date().getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24));
          recruiterStats[recruiterId].total_days += days;
          recruiterStats[recruiterId].hired_count++;
        }
      }
    });

      const recruiterArray: RecruiterPerformance[] = Object.values(recruiterStats)
        .map((r: any) => ({
          recrutador_nome: r.recrutador_nome,
          vagas: r.vagas,
          candidatos: r.candidatos,
          contratacoes: r.contratacoes,
          avg_time_to_hire: r.hired_count > 0 ? Math.round(r.total_days / r.hired_count) : 0
        }))
        .sort((a, b) => b.contratacoes - a.contratacoes)
        .slice(0, 10);

      setRecruiterData(recruiterArray);
    } catch (error) {
      console.error("Erro ao carregar performance de recrutadores:", error);
      setRecruiterData([]);
    }
  };

  const loadOverdueJobs = async () => {
    const { data } = await supabase
      .from("vagas")
      .select("id, titulo, empresa, criado_em, status")
      .not("status", "in", '("Concluída","Cancelada")')
      .order("criado_em", { ascending: true })
      .limit(20);

    if (!data) return;

    const overdue = data
      .map(v => ({
        ...v,
        days_elapsed: Math.floor((new Date().getTime() - new Date(v.criado_em).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(v => v.days_elapsed > 30);

    setOverdueJobs(overdue);
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Sem dados para exportar");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Métricas e análises do processo de recrutamento</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => {
            const allData = {
              kpis: kpiData,
              time_per_stage: timePerStage,
              origin_performance: originData,
              recruiter_performance: recruiterData,
              overdue_jobs: overdueJobs
            };
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `relatorio_completo_${format(new Date(), 'yyyy-MM-dd')}.json`;
            link.click();
            toast.success("Relatório completo exportado!");
          }}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exportar Relatório Completo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recrutador</Label>
              <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {recruiters.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CS</Label>
              <Select value={selectedCS} onValueChange={setSelectedCS}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {recruiters.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          <>
            <KPICard
              title="Vagas Abertas"
              value={kpiData?.vagas_abertas.toString() || "0"}
              icon={<Briefcase className="h-6 w-6 text-white" />}
              iconBgColor="bg-blue-500"
            />
            <KPICard
              title="Candidatos Novos"
              value={kpiData?.candidatos_novos.toString() || "0"}
              icon={<Users className="h-6 w-6 text-white" />}
              iconBgColor="bg-green-500"
            />
            <KPICard
              title="Contratações"
              value={kpiData?.contratacoes.toString() || "0"}
              icon={<Target className="h-6 w-6 text-white" />}
              iconBgColor="bg-purple-500"
            />
            <KPICard
              title="Time to Hire (dias)"
              value={kpiData?.time_to_hire_avg.toString() || "0"}
              icon={<Clock className="h-6 w-6 text-white" />}
              iconBgColor="bg-orange-500"
            />
            <KPICard
              title="Vagas Fora do Prazo"
              value={kpiData?.sla_violations_count.toString() || "0"}
              icon={<AlertTriangle className="h-6 w-6 text-white" />}
              iconBgColor="bg-red-500"
            />
            <KPICard
              title="Banco de Talentos"
              value={kpiData?.banco_count.toString() || "0"}
              icon={<TrendingUp className="h-6 w-6 text-white" />}
              iconBgColor="bg-teal-500"
            />
          </>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tempo por Etapa */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tempo Médio por Etapa</CardTitle>
                <CardDescription>Dias médios em cada etapa do processo</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => exportCSV(timePerStage, 'tempo_por_etapa')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timePerStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_days" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Origem dos Candidatos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Origem dos Candidatos</CardTitle>
                <CardDescription>Distribuição por fonte de captação</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => exportCSV(originData, 'origem_candidatos')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={originData}
                    dataKey="total"
                    nameKey="origem"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance por Recrutador */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Performance por Recrutador</CardTitle>
              <CardDescription>Métricas individuais de performance</CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => exportCSV(recruiterData, 'performance_recrutador')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : recruiterData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum dado de performance disponível para o período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Recrutador</th>
                    <th className="text-right p-2">Vagas</th>
                    <th className="text-right p-2">Candidatos</th>
                    <th className="text-right p-2">Contratações</th>
                    <th className="text-right p-2">Tempo Médio (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {recruiterData.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-2">{r.recrutador_nome}</td>
                      <td className="text-right p-2">{r.vagas}</td>
                      <td className="text-right p-2">{r.candidatos}</td>
                      <td className="text-right p-2">{r.contratacoes}</td>
                      <td className="text-right p-2">{r.avg_time_to_hire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vagas Fora do Prazo */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Vagas Fora do Prazo ({">"} 30 dias)</CardTitle>
              <CardDescription>Vagas que ultrapassaram o SLA estabelecido</CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => exportCSV(overdueJobs, 'vagas_fora_prazo')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : overdueJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma vaga fora do prazo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Título</th>
                    <th className="text-left p-2">Empresa</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Dias Decorridos</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueJobs.map((job, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-2">{job.titulo}</td>
                      <td className="p-2">{job.empresa}</td>
                      <td className="p-2">{job.status}</td>
                      <td className="text-right p-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          {job.days_elapsed}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

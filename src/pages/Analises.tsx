import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#FFCD00', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b'];

export default function Analises() {
  const [loading, setLoading] = useState(true);
  const [vagasPorStatus, setVagasPorStatus] = useState<any[]>([]);
  const [candidatosPorStatus, setCandidatosPorStatus] = useState<any[]>([]);
  const [vagasPorRecrutador, setVagasPorRecrutador] = useState<any[]>([]);

  useEffect(() => {
    loadAnalises();
  }, []);

  const loadAnalises = async () => {
    try {
      // Vagas por status
      const { data: vagas } = await supabase
        .from("vagas")
        .select("status");
      
      const statusCount: Record<string, number> = {};
      vagas?.forEach((v) => {
        statusCount[v.status] = (statusCount[v.status] || 0) + 1;
      });
      
      setVagasPorStatus(
        Object.entries(statusCount).map(([name, value]) => ({ name, value }))
      );

      // Candidatos por status
      const { data: candidatos } = await supabase
        .from("candidatos")
        .select("status");
      
      const candidatosCount: Record<string, number> = {};
      candidatos?.forEach((c) => {
        candidatosCount[c.status] = (candidatosCount[c.status] || 0) + 1;
      });
      
      setCandidatosPorStatus(
        Object.entries(candidatosCount).map(([name, value]) => ({ name, value }))
      );

      // Vagas por recrutador
      const { data: vagasRecrutador } = await supabase
        .from("vagas")
        .select("recrutador")
        .not("recrutador", "is", null);
      
      const recrutadorCount: Record<string, number> = {};
      vagasRecrutador?.forEach((v) => {
        if (v.recrutador) {
          recrutadorCount[v.recrutador] = (recrutadorCount[v.recrutador] || 0) + 1;
        }
      });
      
      setVagasPorRecrutador(
        Object.entries(recrutadorCount).map(([name, value]) => ({ name, value }))
      );

    } catch (error) {
      console.error("Erro ao carregar análises:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Análises</h1>
        <p className="text-muted-foreground">Métricas e insights do processo de recrutamento</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vagas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vagasPorStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#FFCD00" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidatos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={candidatosPorStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {candidatosPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vagas por Recrutador</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vagasPorRecrutador}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" name="Vagas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

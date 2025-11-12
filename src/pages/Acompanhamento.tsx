import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { Clock, Users, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
  criado_em: string;
  recrutador_id: string | null;
  cs_id: string | null;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Candidato {
  id: string;
  nome_completo: string;
  status: string;
  criado_em: string;
  vaga_relacionada_id: string;
}

interface StageHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  job_id: string;
}

export default function Acompanhamento() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [selectedVaga, setSelectedVaga] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obter ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar vagas do cliente
      const { data: vagasData, error: vagasError } = await supabase
        .from("vagas")
        .select("*")
        .eq("cliente_id", user.id)
        .order("criado_em", { ascending: false });

      if (vagasError) throw vagasError;
      setVagas(vagasData || []);

      // Carregar profiles dos recrutadores e CS
      const userIds = new Set<string>();
      vagasData?.forEach(v => {
        if (v.recrutador_id) userIds.add(v.recrutador_id);
        if (v.cs_id) userIds.add(v.cs_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));

        if (!profilesError && profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));
          setProfiles(profilesMap);
        }
      }

      // Carregar candidatos apenas das vagas do cliente
      const vagaIds = vagasData?.map(v => v.id) || [];
      
      if (vagaIds.length > 0) {
        const { data: candidatosData, error: candidatosError } = await supabase
          .from("candidatos")
          .select("*")
          .in("vaga_relacionada_id", vagaIds)
          .order("criado_em", { ascending: false });

        if (candidatosError) throw candidatosError;
        setCandidatos(candidatosData || []);
      } else {
        setCandidatos([]);
      }

      // Carregar histórico de etapas apenas das vagas do cliente
      if (vagaIds.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from("job_stage_history")
          .select("*")
          .in("job_id", vagaIds)
          .order("changed_at", { ascending: false });

        if (historyError) throw historyError;
        setStageHistory(historyData || []);
      } else {
        setStageHistory([]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVagaData = vagas.find(v => v.id === selectedVaga);
  const vagaCandidatos = candidatos.filter(c => c.vaga_relacionada_id === selectedVaga);
  const vagaHistory = stageHistory.filter(h => h.job_id === selectedVaga);

  // Converter histórico para steps do ProcessTimeline
  const timelineSteps = vagaHistory.map((h, index) => ({
    label: h.to_status,
    dates: format(new Date(h.changed_at), "dd/MM/yyyy", { locale: ptBR }),
    status: index === 0 ? "current" as const : "completed" as const
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF6]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Acompanhamento de Processos</h1>
            <p className="text-sm text-muted-foreground mt-2">Visualize o andamento das suas vagas</p>
          </div>
          {vagas.length > 1 && (
            <Select value={selectedVaga || ""} onValueChange={setSelectedVaga}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Selecione uma vaga" />
              </SelectTrigger>
              <SelectContent>
                {vagas.map(vaga => (
                  <SelectItem key={vaga.id} value={vaga.id}>
                    {vaga.titulo} - {vaga.empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Visão Geral - Cards de Vagas */}
        {!selectedVaga && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vagas.map(vaga => {
              const vagaCandidatosCount = candidatos.filter(c => c.vaga_relacionada_id === vaga.id).length;
              
              return (
                <Card 
                  key={vaga.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-card border-border/50"
                  onClick={() => setSelectedVaga(vaga.id)}
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-xl text-foreground font-semibold">{vaga.titulo}</CardTitle>
                      <StatusBadge status={vaga.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{vaga.empresa}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{vagaCandidatosCount} candidato{vagaCandidatosCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{format(new Date(vaga.criado_em), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    {(vaga.recrutador_id || vaga.cs_id) && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        {vaga.recrutador_id && profiles.get(vaga.recrutador_id) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs"><span className="font-semibold">Recrutador:</span> {profiles.get(vaga.recrutador_id)}</span>
                          </div>
                        )}
                        {vaga.cs_id && profiles.get(vaga.cs_id) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs"><span className="font-semibold">CS:</span> {profiles.get(vaga.cs_id)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detalhes da Vaga Selecionada */}
        {selectedVaga && selectedVagaData && (
          <div className="space-y-6">
            {/* Informações da Vaga */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl text-foreground font-bold">{selectedVagaData.titulo}</CardTitle>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedVagaData.empresa}</span>
                    </p>
                  </div>
                  <StatusBadge status={selectedVagaData.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3 bg-muted/30 rounded-lg p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">Data de Abertura</p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {format(new Date(selectedVagaData.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedVagaData.recrutador_id && profiles.get(selectedVagaData.recrutador_id) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">Recrutador Responsável</p>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        {profiles.get(selectedVagaData.recrutador_id)}
                      </p>
                    </div>
                  )}
                  {selectedVagaData.cs_id && profiles.get(selectedVagaData.cs_id) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">CS Responsável</p>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        {profiles.get(selectedVagaData.cs_id)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Linha do Tempo */}
            {timelineSteps.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground font-semibold">Linha do Tempo do Processo</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Histórico de mudanças de etapa</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <ProcessTimeline steps={timelineSteps} />
                </CardContent>
              </Card>
            )}

            {/* Lista de Candidatos */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground font-semibold">Candidatos no Processo</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {vagaCandidatos.length} {vagaCandidatos.length === 1 ? 'candidato' : 'candidatos'} vinculado{vagaCandidatos.length === 1 ? '' : 's'}
                </p>
              </CardHeader>
              <CardContent>
                {vagaCandidatos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum candidato vinculado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vagaCandidatos.map(candidato => (
                      <div 
                        key={candidato.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{candidato.nome_completo}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Desde {format(new Date(candidato.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-background font-medium">
                          {candidato.status}
                        </Badge>
                      </div>
                    ))}
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
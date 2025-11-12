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
      
      // Carregar vagas do cliente
      const { data: vagasData, error: vagasError } = await supabase
        .from("vagas")
        .select("*")
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

      // Carregar candidatos de todas as vagas do cliente
      const { data: candidatosData, error: candidatosError } = await supabase
        .from("candidatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (candidatosError) throw candidatosError;
      setCandidatos(candidatosData || []);

      // Carregar histórico de etapas
      const { data: historyData, error: historyError } = await supabase
        .from("job_stage_history")
        .select("*")
        .order("changed_at", { ascending: false });

      if (historyError) throw historyError;
      setStageHistory(historyData || []);

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
    <div className="min-h-screen bg-[#FFFDF6] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#00141D]">Acompanhamento de Processos</h1>
            <p className="text-sm text-[#36404A] mt-1">Visualize o andamento das suas vagas</p>
          </div>
          <Select value={selectedVaga || ""} onValueChange={setSelectedVaga}>
            <SelectTrigger className="w-[300px]">
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
        </div>

        {/* Visão Geral - Cards de Vagas */}
        {!selectedVaga && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vagas.map(vaga => {
              const vagaCandidatosCount = candidatos.filter(c => c.vaga_relacionada_id === vaga.id).length;
              
              return (
                <Card 
                  key={vaga.id}
                  className="cursor-pointer transition-all hover:shadow-md bg-white border-[#FAEC3E]/20"
                  onClick={() => setSelectedVaga(vaga.id)}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-[#00141D]">{vaga.titulo}</CardTitle>
                      <StatusBadge status={vaga.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#36404A]">
                      <Building2 className="h-4 w-4" />
                      <span>{vaga.empresa}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-[#36404A]">
                        <Users className="h-4 w-4" />
                        <span>{vagaCandidatosCount} candidato{vagaCandidatosCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#36404A]">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(vaga.criado_em), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-[#FAEC3E]/20">
                      {vaga.recrutador_id && profiles.get(vaga.recrutador_id) && (
                        <div className="flex items-center gap-2 text-sm text-[#36404A]">
                          <User className="h-3.5 w-3.5" />
                          <span className="text-xs">Recrutador: {profiles.get(vaga.recrutador_id)}</span>
                        </div>
                      )}
                      {vaga.cs_id && profiles.get(vaga.cs_id) && (
                        <div className="flex items-center gap-2 text-sm text-[#36404A]">
                          <User className="h-3.5 w-3.5" />
                          <span className="text-xs">CS: {profiles.get(vaga.cs_id)}</span>
                        </div>
                      )}
                    </div>
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
            <Card className="bg-white border-[#FAEC3E]/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-[#00141D]">{selectedVagaData.titulo}</CardTitle>
                    <p className="text-[#36404A] mt-1">{selectedVagaData.empresa}</p>
                  </div>
                  <StatusBadge status={selectedVagaData.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-[#36404A]">Data de Abertura</p>
                    <p className="font-medium text-[#00141D]">
                      {format(new Date(selectedVagaData.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedVagaData.recrutador_id && profiles.get(selectedVagaData.recrutador_id) && (
                    <div className="space-y-1">
                      <p className="text-sm text-[#36404A]">Recrutador Responsável</p>
                      <p className="font-medium text-[#00141D]">{profiles.get(selectedVagaData.recrutador_id)}</p>
                    </div>
                  )}
                  {selectedVagaData.cs_id && profiles.get(selectedVagaData.cs_id) && (
                    <div className="space-y-1">
                      <p className="text-sm text-[#36404A]">CS Responsável</p>
                      <p className="font-medium text-[#00141D]">{profiles.get(selectedVagaData.cs_id)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Linha do Tempo */}
            {timelineSteps.length > 0 && (
              <Card className="bg-white border-[#FAEC3E]/20">
                <CardHeader>
                  <CardTitle className="text-[#00141D]">Linha do Tempo do Processo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProcessTimeline steps={timelineSteps} />
                </CardContent>
              </Card>
            )}

            {/* Lista de Candidatos */}
            <Card className="bg-white border-[#FAEC3E]/20">
              <CardHeader>
                <CardTitle className="text-[#00141D]">Candidatos no Processo</CardTitle>
              </CardHeader>
              <CardContent>
                {vagaCandidatos.length === 0 ? (
                  <p className="text-center text-[#36404A] py-8">Nenhum candidato vinculado ainda</p>
                ) : (
                  <div className="space-y-3">
                    {vagaCandidatos.map(candidato => (
                      <div 
                        key={candidato.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#FFFDF6] border border-[#FAEC3E]/20"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-[#00141D]">{candidato.nome_completo}</p>
                          <p className="text-sm text-[#36404A]">
                            Desde {format(new Date(candidato.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-white">
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
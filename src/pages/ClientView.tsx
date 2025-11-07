import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Briefcase, FileText, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/salaryUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VagaData {
  titulo: string;
  empresa: string;
  descricao: string | null;
  status: string;
  statusSlug: string;
  salarioMin: number | null;
  salarioMax: number | null;
  tipoContrato: string | null;
  modeloTrabalho: string | null;
  criadoEm: string;
  candidatosAtivos: number;
  duracaoDias: number;
}

interface TimelineEvent {
  from_status: string | null;
  to_status: string;
  changed_at: string;
}

export default function ClientView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vaga, setVaga] = useState<VagaData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-client-view-data', {
        body: { token }
      });

      if (fetchError) throw fetchError;

      if (data.error) {
        setError(data.error);
        return;
      }

      setVaga(data.vaga);
      setTimeline(data.timeline || []);
    } catch (err) {
      console.error('Error loading client view:', err);
      setError('Erro ao carregar dados da vaga');
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    { slug: 'a_iniciar', name: 'A iniciar' },
    { slug: 'discovery', name: 'Discovery' },
    { slug: 'divulgacao', name: 'Divulgação' },
    { slug: 'triagem', name: 'Triagem' },
    { slug: 'entrevistas_rhello', name: 'Entrevistas rhello' },
  ];

  const getCurrentStageIndex = () => {
    if (!vaga) return 0;
    return stages.findIndex(s => s.slug === vaga.statusSlug);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !vaga) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFFBF0' }}>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Não foi possível carregar os dados da vaga'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: '#FFFBF0' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{vaga.titulo}</h1>
          <p className="text-base text-muted-foreground">
            {vaga.empresa} • Acompanhe o progresso do processo de contratação
          </p>
          {(vaga.salarioMin || vaga.salarioMax) && (
            <p className="text-lg font-semibold text-foreground flex items-center gap-2">
              💰 Até {formatCurrency(vaga.salarioMax || vaga.salarioMin || 0)}
            </p>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Etapa Atual da Contratação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <Badge variant="default" className="text-base">
                  {vaga.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Candidatos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{vaga.candidatosAtivos}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Duração do Processo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{vaga.duracaoDias} Dias</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Modelo de Trabalho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-semibold">{vaga.modeloTrabalho || 'Não especificado'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {vaga.tipoContrato && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Formato da Contratação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-semibold">{vaga.tipoContrato}</span>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Linha do Tempo do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-border">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                />
              </div>

              {/* Stages */}
              <div className="relative flex justify-between">
                {stages.map((stage, index) => {
                  const isCompleted = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;

                  return (
                    <div key={stage.slug} className="flex flex-col items-center">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center mb-2 z-10
                          ${isCompleted ? 'bg-primary' : 'bg-border'}
                          ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                          transition-all duration-300
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-background" />
                        )}
                      </div>
                      <span className={`
                        text-sm font-medium text-center max-w-[100px]
                        ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                      `}>
                        {stage.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress percentage */}
            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                Progresso: {Math.round((currentStageIndex / (stages.length - 1)) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Etapa da vaga alterada {event.from_status ? `de "${event.from_status}"` : ''} para "{event.to_status}"
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.changed_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

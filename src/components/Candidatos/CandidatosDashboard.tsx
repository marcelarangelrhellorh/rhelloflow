import { Card } from "@/components/ui/card";
import { Users, Clock, CheckCircle, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CandidatosDashboardProps {
  candidatos: Array<{
    id: string;
    status: string;
    disponibilidade_status?: string | null;
  }>;
  statsByStatus: Record<string, number>;
}

export function CandidatosDashboard({ candidatos, statsByStatus }: CandidatosDashboardProps) {
  const navigate = useNavigate();
  
  const total = candidatos.length;
  const bancoTalentos = statsByStatus["Banco de Talentos"] || 0;
  const selecionados = statsByStatus["Selecionado"] || 0;
  const entrevistaRhello = statsByStatus["Entrevista rhello"] || 0;
  const shortlist = statsByStatus["Shortlist"] || 0;
  const entrevistasSolicitante = statsByStatus["Entrevistas Solicitante"] || 0;
  const contratados = statsByStatus["Contratado"] || 0;
  const reprovadoRhello = statsByStatus["Reprovado Rhello"] || 0;

  // Candidatos que precisam de atenção
  const aguardandoFeedback = entrevistasSolicitante;
  const disponiveis = candidatos.filter(c => c.disponibilidade_status === "disponível").length;

  return (
    <div className="space-y-4 sticky top-24">
      {/* Status Summary */}
      <Card className="p-4 border-gray-300 shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Painel de Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-lg text-foreground">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Banco de Talentos</span>
            </div>
            <span className="font-bold text-blue-600">{bancoTalentos}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Selecionados</span>
            </div>
            <span className="font-bold text-green-600">{selecionados}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-sm text-muted-foreground">Shortlist</span>
            </div>
            <span className="font-bold text-indigo-600">{shortlist}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-500" />
              <span className="text-sm text-muted-foreground">Contratados</span>
            </div>
            <span className="font-bold text-lime-600">{contratados}</span>
          </div>
        </div>
      </Card>

      {/* Atenção Necessária */}
      <Card className="p-4 border-gray-300 shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Atenção Necessária
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/candidatos?attention=awaiting_client_feedback')}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Aguardando feedback</span>
            </div>
            <span className="font-bold text-purple-600">{aguardandoFeedback}</span>
          </button>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Entrevista rhello</span>
            </div>
            <span className="font-bold text-amber-600">{entrevistaRhello}</span>
          </div>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Disponíveis</span>
            </div>
            <span className="font-bold text-green-600">{disponiveis}</span>
          </div>
        </div>
      </Card>

      {/* Conversão */}
      <Card className="p-4 border-gray-300 shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pipeline Rápido
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Entrevista rhello</span>
            <span className="font-bold text-foreground">{entrevistaRhello}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aprovado rhello</span>
            <span className="font-bold text-foreground">{statsByStatus["Aprovado Rhello"] || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Entrevista solicitante</span>
            <span className="font-bold text-foreground">{entrevistasSolicitante}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reprovado rhello</span>
            <span className="font-bold text-red-600">{reprovadoRhello}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Users, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface CandidatosDashboardProps {
  candidatos: Array<{
    id: string;
    status: string;
    disponibilidade_status?: string | null;
  }>;
  statsByStatus: Record<string, number>;
}

export function CandidatosDashboard({ candidatos, statsByStatus }: CandidatosDashboardProps) {
  const total = candidatos.length;
  const bancoTalentos = statsByStatus["Banco de Talentos"] || 0;
  const triagem = statsByStatus["Triagem"] || 0;
  const assessment = statsByStatus["Assessment | Teste Técnico"] || 0;
  const entrevista = statsByStatus["Entrevista"] || 0;
  const shortlist = statsByStatus["Shortlist"] || 0;
  const reprovado = statsByStatus["Reprovado"] || 0;
  const contratados = statsByStatus["Contratado"] || 0;

  const disponiveis = candidatos.filter(c => c.disponibilidade_status === "disponível").length;

  return (
    <div className="space-y-4 sticky top-24">
      {/* Status Summary */}
      <Card className="p-4 border-border shadow-md">
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
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-sm text-muted-foreground">Triagem</span>
            </div>
            <span className="font-bold text-slate-600">{triagem}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm text-muted-foreground">Assessment | Teste Técnico</span>
            </div>
            <span className="font-bold text-purple-600">{assessment}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Entrevista</span>
            </div>
            <span className="font-bold text-blue-600">{entrevista}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Shortlist</span>
            </div>
            <span className="font-bold text-amber-600">{shortlist}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Reprovado</span>
            </div>
            <span className="font-bold text-red-600">{reprovado}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Contratados</span>
            </div>
            <span className="font-bold text-green-600">{contratados}</span>
          </div>
        </div>
      </Card>

      {/* Atenção Necessária */}
      <Card className="p-4 border-border shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Atenção Necessária
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Shortlist</span>
            </div>
            <span className="font-bold text-amber-600">{shortlist}</span>
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

      {/* Pipeline Rápido */}
      <Card className="p-4 border-border shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pipeline Rápido
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-sm text-muted-foreground">Triagem</span>
            </div>
            <span className="font-bold text-slate-600">{triagem}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm text-muted-foreground">Assessment</span>
            </div>
            <span className="font-bold text-purple-600">{assessment}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Entrevista</span>
            </div>
            <span className="font-bold text-blue-600">{entrevista}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Shortlist</span>
            </div>
            <span className="font-bold text-amber-600">{shortlist}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Contratado</span>
            </div>
            <span className="font-bold text-green-600">{contratados}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

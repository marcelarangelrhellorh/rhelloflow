import { Card } from "@/components/ui/card";
import { Building2, CheckCircle, Clock, Users, TrendingUp, Target } from "lucide-react";

interface EmpresasDashboardProps {
  empresas: Array<{
    status: string | null;
    pipeline_stage?: string | null;
  }>;
}

const pipelineStages = [
  { slug: "novo_negocio", label: "Novo negócio" },
  { slug: "contato_realizado", label: "Contato realizado" },
  { slug: "discovery", label: "Discovery" },
  { slug: "processo_andamento", label: "Processo em andamento" },
  { slug: "processo_finalizado", label: "Processo finalizado" },
  { slug: "acompanhamento_30_60_90", label: "Acompanhamento 30/60/90" },
];

export function EmpresasDashboard({ empresas }: EmpresasDashboardProps) {
  const total = empresas.length;
  const ativos = empresas.filter(e => e.status === "ativo").length;
  const prospects = empresas.filter(e => e.status === "prospect").length;
  const inativos = empresas.filter(e => e.status === "inativo").length;

  const pipelineCounts = pipelineStages.map(stage => ({
    ...stage,
    count: empresas.filter(e => e.pipeline_stage === stage.slug).length
  }));

  return (
    <div className="space-y-4 sticky top-24">
      {/* Status Summary */}
      <Card className="p-4 border-gray-300 shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Resumo
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-lg text-foreground">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Ativos</span>
            </div>
            <span className="font-bold text-green-600">{ativos}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Prospects</span>
            </div>
            <span className="font-bold text-blue-600">{prospects}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-sm text-muted-foreground">Inativos</span>
            </div>
            <span className="font-bold text-gray-600">{inativos}</span>
          </div>
        </div>
      </Card>

      {/* Pipeline Summary */}
      <Card className="p-4 border-gray-300 shadow-md">
        <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pipeline
        </h3>
        <div className="space-y-2">
          {pipelineCounts.map(stage => (
            <div key={stage.slug} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate pr-2">{stage.label}</span>
              <span className="font-bold text-foreground">{stage.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

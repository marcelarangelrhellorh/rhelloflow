import { Card } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmpresaKPICardsProps {
  vagasAbertas: number;
  vagasConcluidas: number;
  totalContratacoes: number;
  clienteSince: string | null;
}

export function EmpresaKPICards({
  vagasAbertas,
  vagasConcluidas,
  totalContratacoes,
  clienteSince,
}: EmpresaKPICardsProps) {
  const kpis = [
    {
      label: "Vagas Abertas",
      value: vagasAbertas,
      icon: Briefcase,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Vagas Concluídas",
      value: vagasConcluidas,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Contratações",
      value: totalContratacoes,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Cliente Desde",
      value: clienteSince
        ? format(new Date(clienteSince), "MMM yyyy", { locale: ptBR })
        : "-",
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      isDate: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className="p-4 border-border/50 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <div
                className={`text-2xl font-bold text-foreground ${
                  kpi.isDate ? "text-lg" : ""
                }`}
              >
                {kpi.value}
              </div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

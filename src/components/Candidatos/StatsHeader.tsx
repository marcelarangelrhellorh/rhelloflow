import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface StatsHeaderProps {
  total: number;
  byStatus: Record<string, number>;
}

const statusColors: Record<string, string> = {
  "Selecionado": "bg-primary/10 text-primary border-primary/20",
  "Entrevista Rhello": "bg-warning/10 text-warning border-warning/20",
  "Aprovado": "bg-success/10 text-success border-success/20",
  "Declinou": "bg-destructive/10 text-destructive border-destructive/20",
  "Reprovado Cliente": "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcons: Record<string, string> = {
  "Selecionado": "🟡",
  "Entrevista Rhello": "🔵",
  "Aprovado": "🟢",
  "Declinou": "🔴",
  "Reprovado Cliente": "🔴",
};

export function StatsHeader({ total, byStatus }: StatsHeaderProps) {
  const activeStatuses = ["Selecionado", "Entrevista Rhello", "Enviado ao Cliente"];
  const activeCount = Object.entries(byStatus)
    .filter(([status]) => activeStatuses.includes(status))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span className="text-lg font-semibold text-foreground">{total} candidatos</span>
      </div>
      
      <div className="h-6 w-px bg-border" />
      
      {activeCount > 0 && (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          🟢 {activeCount} ativos
        </Badge>
      )}
      
      {Object.entries(byStatus).map(([status, count]) => {
        if (count === 0 || activeStatuses.includes(status)) return null;
        
        return (
          <Badge
            key={status}
            variant="outline"
            className={statusColors[status] || "bg-muted/10 text-muted-foreground border-muted"}
          >
            {statusIcons[status] || "⚪"} {count} {status.toLowerCase()}
          </Badge>
        );
      })}
    </div>
  );
}

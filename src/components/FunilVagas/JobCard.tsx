import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, User, Users, Calendar, MoreVertical, Eye, Edit, Copy, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
}

interface JobCardProps {
  vaga: Vaga;
  diasEmAberto: number;
  progresso: number;
  onDragStart: () => void;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  isDragging?: boolean;
}

const statusColors: Record<string, string> = {
  "A iniciar": "bg-success/10 text-success border-success/20",
  "Discovery": "bg-info/10 text-info border-info/20",
  "Triagem": "bg-warning/10 text-warning border-warning/20",
  "Entrevistas Rhello": "bg-warning/10 text-warning border-warning/20",
  "Shortlist enviada": "bg-primary/10 text-primary border-primary/20",
  "Entrevistas Cliente": "bg-muted/50 text-muted-foreground border-muted",
  "Em fechamento": "bg-success/10 text-success border-success/20",
  "Concluídas": "bg-success/10 text-success border-success/20",
  "Cancelada": "bg-destructive/10 text-destructive border-destructive/20",
};

const getProgressColor = (progress: number) => {
  if (progress >= 75) return "bg-success";
  if (progress >= 50) return "bg-primary";
  if (progress >= 25) return "bg-warning";
  return "bg-info";
};

export function JobCard({
  vaga,
  diasEmAberto,
  progresso,
  onDragStart,
  onView,
  onEdit,
  onDuplicate,
  onClose,
  isDragging,
}: JobCardProps) {
  const isAtRisk = diasEmAberto > 30;
  const needsAttention = diasEmAberto > 7 && diasEmAberto <= 30;

  return (
    <Card
      draggable
      onMouseDown={onDragStart}
      className={cn(
        "cursor-move transition-all duration-200 hover:shadow-md hover:scale-[1.01] bg-card",
        isDragging && "shadow-lg rotate-3 opacity-50"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", statusColors[vaga.status] || statusColors["A iniciar"])}
          >
            {vaga.status}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Encerrar vaga
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 min-h-[2.5rem]">
          {vaga.titulo}
        </h3>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Cliente */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{vaga.empresa}</span>
        </div>

        {/* Recrutador */}
        {vaga.recrutador && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{vaga.recrutador}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-card-foreground">{progresso}%</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={cn("h-full transition-all", getProgressColor(progresso))}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Counters */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{vaga.candidatos_count || 0}</span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            {isAtRisk ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                <AlertCircle className="h-3 w-3" />
                {diasEmAberto}d
              </Badge>
            ) : needsAttention ? (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
                <Clock className="h-3 w-3" />
                {diasEmAberto}d
              </Badge>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {diasEmAberto}d
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

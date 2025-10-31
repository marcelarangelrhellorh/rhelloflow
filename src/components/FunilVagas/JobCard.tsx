import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, User, Users, Calendar, MoreVertical, Eye, Edit, Copy, XCircle, Clock, AlertCircle, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel?: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
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
  stageColor?: { bg: string; text: string; columnBg: string };
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
  stageColor,
}: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: vaga.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isAtRisk = diasEmAberto > 30;
  const needsAttention = diasEmAberto > 7 && diasEmAberto <= 30;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] group",
          "bg-white border border-gray-200"
        )}
        onClick={onView}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 cursor-move" {...attributes} {...listeners}>
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
                {vaga.confidencial && <span className="mr-1">🔒</span>}
                {vaga.titulo}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{vaga.empresa}</p>
            </div>
            
            <div className="flex items-center gap-1">
              {stageColor && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: stageColor.bg,
                    color: stageColor.text,
                    borderColor: stageColor.text + "30",
                  }}
                >
                  {vaga.status}
                </Badge>
              )}

          <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar vaga
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Encerrar vaga
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Footer info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{vaga.candidatos_count || 0}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className={cn(
                isAtRisk ? "text-destructive font-medium" : 
                needsAttention ? "text-warning" : ""
              )}>
                {diasEmAberto}d úteis
              </span>
            </div>
            
            <div className="ml-auto text-xs">
              {progresso}%
            </div>
          </div>

          {/* Team info */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {vaga.recrutador && (
              <span className="truncate">Rec: {vaga.recrutador}</span>
            )}
            {vaga.cs_responsavel && (
              <span className="truncate">CS: {vaga.cs_responsavel}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

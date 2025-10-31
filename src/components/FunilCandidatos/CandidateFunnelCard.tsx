import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, MapPin, Eye, MessageSquare, Link as LinkIcon, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Candidato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  area: string | null;
  nivel: string | null;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  criado_em: string;
}

interface CandidateFunnelCardProps {
  candidato: Candidato;
  onDragStart: () => void;
  isDragging?: boolean;
}

export function CandidateFunnelCard({ candidato, onDragStart, isDragging }: CandidateFunnelCardProps) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: candidato.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Calculate time in stage
  const timeInStage = candidato.criado_em
    ? formatDistanceToNow(new Date(candidato.criado_em), {
        addSuffix: false,
        locale: ptBR,
      })
    : null;

  // Check if candidate is in a final stage
  const isFinalStage = ["Reprovado Rhello", "Reprovado Solicitante", "Contratado"].includes(candidato.status);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      return;
    }
    navigate(`/candidatos/${candidato.id}`);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={onDragStart}
      onClick={handleCardClick}
      className={cn(
        "cursor-move transition-all duration-200 hover:shadow-md hover:scale-[1.01] bg-card",
        isDragging && "shadow-lg rotate-3 opacity-50",
        isFinalStage && "opacity-60 hover:opacity-70"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground line-clamp-2">
          {candidato.nome_completo}
        </CardTitle>
        {timeInStage && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>há {timeInStage}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-3">
        {/* Contact Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{candidato.email}</span>
          </div>
          
          {candidato.telefone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{candidato.telefone}</span>
            </div>
          )}
          
          {(candidato.cidade || candidato.estado) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
              </span>
            </div>
          )}
        </div>

        {/* Recruiter Badge */}
        {candidato.recrutador && (
          <Badge variant="outline" className="text-xs">
            {candidato.recrutador}
          </Badge>
        )}

        {/* Quick Actions */}
        <TooltipProvider>
          <div className="flex gap-1 pt-2 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/candidatos/${candidato.id}`);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver perfil completo</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add observation modal
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Adicionar observação</p>
              </TooltipContent>
            </Tooltip>

            {!candidato.vaga_relacionada_id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Link to job modal
                    }}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vincular à vaga</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, MapPin, Eye, MessageSquare, Link as LinkIcon, Clock, Check } from "lucide-react";
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
  vaga?: {
    titulo?: string | null;
  };
}

interface CandidateFunnelCardProps {
  candidato: Candidato;
  onDragStart: () => void;
  isDragging?: boolean;
}

// Cores dos status conforme especificação
const statusColors: Record<string, { bg: string; text: string }> = {
  "Novo": { bg: "#2E7D32", text: "#FFFFFF" },
  "Em Análise": { bg: "#1976D2", text: "#FFFFFF" },
  "Qualificado": { bg: "#0288D1", text: "#FFFFFF" },
  "Entrevista Agendada": { bg: "#512DA8", text: "#FFFFFF" },
  "Em Entrevista": { bg: "#F57C00", text: "#FFFFFF" },
  "Aguardando Feedback": { bg: "#8D6E63", text: "#FFFFFF" },
  "Aprovado Rhello": { bg: "#00796B", text: "#FFFFFF" },
  "Apresentado ao Cliente": { bg: "#0097A7", text: "#FFFFFF" },
  "Em Entrevista Cliente": { bg: "#5C6BC0", text: "#FFFFFF" },
  "Aprovado Cliente": { bg: "#2E7D32", text: "#FFFFFF" },
  "Em Processo de Contratação": { bg: "#00796B", text: "#FFFFFF" },
  "Contratado": { bg: "#2E7D32", text: "#FFFFFF" },
  "Reprovado Rhello": { bg: "#D32F2F", text: "#FFFFFF" },
  "Reprovado Solicitante": { bg: "#D32F2F", text: "#FFFFFF" },
  "Desistente": { bg: "#757575", text: "#FFFFFF" },
};

// Função para obter iniciais do nome
const getInitials = (name: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

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
  const isContratado = candidato.status === "Contratado";
  const statusColor = statusColors[candidato.status] || { bg: "#757575", text: "#FFFFFF" };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      return;
    }
    navigate(`/candidatos/${candidato.id}`);
  };

  return (
    <TooltipProvider>
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
            "relative cursor-pointer transition-all duration-200 group overflow-hidden",
            "bg-card border-border rounded-xl shadow-sm",
            "hover:shadow-md hover:scale-[1.01]",
            isFinalStage && "opacity-70"
          )}
          onClick={handleCardClick}
          style={{ minHeight: "44px" }}
        >
          <div className="relative p-4 space-y-3" {...listeners} {...attributes} onMouseDown={onDragStart}>
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="font-bold text-base text-card-foreground truncate leading-tight">
                        {candidato.nome_completo}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{candidato.nome_completo}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Vaga vinculada */}
              {candidato.vaga?.titulo && (
                <div className="flex items-center gap-2">
                  <Badge className="text-sm font-medium bg-[#faec3e]/30 text-[#00141D] border border-[#faec3e] hover:bg-[#faec3e]/40">
                    📋 {candidato.vaga.titulo}
                  </Badge>
                </div>
              )}
            </div>

            {/* Contact Info & Métricas */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{candidato.email}</span>
              </div>
              
              {candidato.telefone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{candidato.telefone}</span>
                </div>
              )}
              
              {(candidato.cidade || candidato.estado) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
                  </span>
                </div>
              )}

              {timeInStage && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>há {timeInStage}</span>
                </div>
              )}
            </div>

            {/* Rodapé - Recrutador e Ações */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {candidato.recrutador && (
                <Badge variant="outline" className="text-sm gap-1.5">
                  <Avatar className="h-5 w-5 bg-[#FFCD00]">
                    <AvatarFallback className="text-[#00141D] text-[10px] font-bold">
                      {getInitials(candidato.recrutador)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{candidato.recrutador.split(" ")[0]}</span>
                </Badge>
              )}

              {/* Quick Actions */}
              <div className="flex gap-1">
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
                      <Eye className="h-4 w-4" />
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
                      <MessageSquare className="h-4 w-4" />
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
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vincular à vaga</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

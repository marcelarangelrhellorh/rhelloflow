import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Clock, Check } from "lucide-react";
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
  area?: string | null;
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

// Cores dos status conforme especificação
const statusColors: Record<string, { bg: string; text: string }> = {
  "A iniciar": { bg: "#2E7D32", text: "#FFFFFF" },
  "Discovery": { bg: "#1976D2", text: "#FFFFFF" },
  "Divulgação": { bg: "#0288D1", text: "#FFFFFF" },
  "Triagem": { bg: "#512DA8", text: "#FFFFFF" },
  "Entrevistas rhello": { bg: "#F57C00", text: "#FFFFFF" },
  "Aguardando retorno do cliente": { bg: "#8D6E63", text: "#FFFFFF" },
  "Apresentação de candidatos": { bg: "#0097A7", text: "#FFFFFF" },
  "Entrevistas solicitante": { bg: "#5C6BC0", text: "#FFFFFF" },
  "Em processo de contratação": { bg: "#00796B", text: "#FFFFFF" },
  "Concluída": { bg: "#2E7D32", text: "#FFFFFF" },
  "Congelada": { bg: "#455A64", text: "#FFFFFF" },
  "Pausada": { bg: "#757575", text: "#FFFFFF" },
  "Cancelada": { bg: "#D32F2F", text: "#FFFFFF" },
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

  const statusColor = statusColors[vaga.status] || { bg: "#757575", text: "#FFFFFF" };
  const isConcluida = vaga.status === "Concluída";

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
            "bg-white border border-gray-200 rounded-xl",
            "hover:shadow-lg hover:-translate-y-0.5",
            vaga.confidencial && "border-l-4 border-l-[#D32F2F]"
          )}
          onClick={onView}
          style={{ minHeight: "44px" }}
        >
          <div className="relative p-4 space-y-3" {...attributes} {...listeners}>
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {vaga.confidencial && (
                      <Badge 
                        className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                        style={{ 
                          backgroundColor: "rgba(211, 47, 47, 0.9)", 
                          color: "#FFFFFF" 
                        }}
                      >
                        Confidencial
                      </Badge>
                    )}
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 
                        className="font-bold text-[16px] text-[#00141D] truncate leading-tight"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {vaga.titulo}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{vaga.titulo}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Badge
                  className="text-[11px] font-semibold whitespace-nowrap px-2 py-1 flex items-center gap-1 shrink-0"
                  style={{
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                  }}
                >
                  {isConcluida && <Check className="h-3 w-3" />}
                  {vaga.status}
                </Badge>
              </div>

              {/* Subheader - Cliente/Área */}
              <div className="flex items-center gap-2">
                <p 
                  className="text-[13px] font-medium text-[#6B7280] truncate"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {vaga.empresa}
                  {vaga.area && ` • ${vaga.area}`}
                </p>
              </div>
            </div>

            {/* Métricas rápidas */}
            <div className="flex items-center gap-3 text-[12px] font-semibold" style={{ fontFamily: "Manrope, sans-serif" }}>
              <div className="flex items-center gap-1 text-[#6B7280]">
                <Users className="h-3.5 w-3.5" />
                <span>{vaga.candidatos_count || 0}</span>
              </div>
              
              <div className="flex items-center gap-1 text-[#6B7280]">
                <Clock className="h-3.5 w-3.5" />
                <span>{diasEmAberto}d úteis</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 rounded-full"
                  style={{ 
                    width: `${progresso}%`,
                    backgroundColor: "#F9EC3F" 
                  }}
                />
              </div>
              <div className="flex justify-end">
                <span 
                  className="text-[12px] font-semibold text-[#6B7280]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {progresso}%
                </span>
              </div>
            </div>

            {/* Rodapé - Chips de equipe */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {vaga.recrutador && (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                  <Avatar className="h-5 w-5 bg-[#F9EC3F]">
                    <AvatarFallback 
                      className="text-[#00141D] text-[10px] font-bold"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {getInitials(vaga.recrutador)}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className="text-[12px] font-medium text-[#00141D]"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {vaga.recrutador.split(" ")[0]}
                  </span>
                </div>
              )}
              
              {vaga.cs_responsavel && (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                  <Avatar className="h-5 w-5 bg-[#00141D]">
                    <AvatarFallback 
                      className="text-[#F9EC3F] text-[10px] font-bold"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {getInitials(vaga.cs_responsavel)}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className="text-[12px] font-medium text-[#00141D]"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {vaga.cs_responsavel.split(" ")[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

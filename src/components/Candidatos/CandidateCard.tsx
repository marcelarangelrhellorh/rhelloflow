import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Mail, MapPin, Briefcase, Eye, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Candidato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  disponibilidade_status?: string | null;
}

interface CandidateCardProps {
  candidato: Candidato;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkJob: () => void;
  viewMode?: "grid" | "list";
}

const statusColors: Record<string, string> = {
  "Banco de Talentos": "bg-muted/10 text-muted-foreground border-muted",
  "Selecionado": "bg-[#BBF7D0] text-green-800 border-green-200",
  "Entrevista Rhello": "bg-[#BFDBFE] text-blue-800 border-blue-200",
  "Reprovado Rhello": "bg-[#FECACA] text-red-800 border-red-200",
  "Aprovado Rhello": "bg-[#FDE68A] text-yellow-800 border-yellow-200",
  "Entrevistas Solicitante": "bg-[#E9D5FF] text-purple-800 border-purple-200",
  "Reprovado Solicitante": "bg-[#FECACA] text-red-800 border-red-200",
  "Aprovado Solicitante": "bg-[#FDE68A] text-yellow-800 border-yellow-200",
  "Contratado": "bg-[#D9F99D] text-lime-800 border-lime-200",
};

const statusIcons: Record<string, string> = {
  "Banco de Talentos": "⚪",
  "Selecionado": "🟢",
  "Entrevista Rhello": "🔵",
  "Reprovado Rhello": "🔴",
  "Aprovado Rhello": "🟡",
  "Entrevistas Solicitante": "🟣",
  "Reprovado Solicitante": "🔴",
  "Aprovado Solicitante": "🟡",
  "Contratado": "✅",
};

export function CandidateCard({ candidato, onView, onEdit, onDelete, onLinkJob, viewMode = "grid" }: CandidateCardProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const isAvailable = candidato.disponibilidade_status !== 'não_disponível';

  return (
    <Card className={cn(
      "hover-lift card-shadow bg-white border border-[#E5E7EB] overflow-hidden rounded-2xl",
      !isAvailable && "opacity-70"
    )}>
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9EC3F]/20 text-[#00141D] font-bold text-sm">
              {getInitials(candidato.nome_completo)}
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs font-bold rounded-full px-3", statusColors[candidato.status] || statusColors["Banco de Talentos"])}
              >
                {statusIcons[candidato.status] || "⚪"} {candidato.status}
              </Badge>
              {candidato.disponibilidade_status === 'disponível' ? (
                <Badge className="text-xs font-bold rounded-full px-3 bg-[#C9F4C7] text-[#1B5E20] hover:bg-[#C9F4C7]/90">
                  ✅ Disponível
                </Badge>
              ) : candidato.disponibilidade_status === 'não_disponível' ? (
                <Badge className="text-xs font-bold rounded-full px-3 bg-[#FFD6D6] text-[#B71C1C] hover:bg-[#FFD6D6]/90">
                  ❌ Não disponível
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-[#00141D] line-clamp-1">
          {candidato.nome_completo}
        </h3>
      </CardHeader>

      <CardContent className="space-y-2 px-5 pb-4">
        {(candidato.nivel || candidato.area) && (
          <div className="flex items-center gap-2 text-sm text-[#00141D]/80 font-medium">
            <Briefcase className="h-4 w-4 flex-shrink-0 text-[#00141D]/60" />
            <span className="truncate">
              {[candidato.nivel, candidato.area].filter(Boolean).join(" – ")}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-[#00141D]/80 font-medium">
          <Mail className="h-4 w-4 flex-shrink-0 text-[#00141D]/60" />
          <span className="truncate">{candidato.email}</span>
        </div>

        {(candidato.cidade || candidato.estado) && (
          <div className="flex items-center gap-2 text-sm text-[#00141D]/80 font-medium">
            <MapPin className="h-4 w-4 flex-shrink-0 text-[#00141D]/60" />
            <span className="truncate">
              {[candidato.cidade, candidato.estado].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {candidato.recrutador && (
          <div className="flex items-center gap-2 text-sm text-[#00141D]/80 font-medium">
            <User className="h-4 w-4 flex-shrink-0 text-[#00141D]/60" />
            <span className="truncate">{candidato.recrutador}</span>
          </div>
        )}

        {/* Quick Actions */}
        <TooltipProvider>
          <div className="flex gap-1 pt-2 border-t border-[#E5E7EB]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 flex-1 hover:bg-[#F9EC3F]/20 hover:text-[#00141D] font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver detalhes</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 flex-1 hover:bg-[#F9EC3F]/20 hover:text-[#00141D] font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar</p>
              </TooltipContent>
            </Tooltip>

            {!candidato.vaga_relacionada_id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 hover:bg-[#F9EC3F]/20 hover:text-[#00141D] font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkJob();
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vincular vaga</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

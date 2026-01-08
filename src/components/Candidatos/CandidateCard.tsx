import React from "react";
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
  vaga_titulo?: string | null;
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
  "Entrevista rhello": "bg-[#BFDBFE] text-blue-800 border-blue-200",
  "Reprovado rhello": "bg-[#FECACA] text-red-800 border-red-200",
  "Aprovado rhello": "bg-[#FDE68A] text-yellow-800 border-yellow-200",
  "Entrevistas Solicitante": "bg-[#E9D5FF] text-purple-800 border-purple-200",
  "Reprovado Solicitante": "bg-[#FECACA] text-red-800 border-red-200",
  "Aprovado Solicitante": "bg-[#FDE68A] text-yellow-800 border-yellow-200",
  "Contratado": "bg-[#D9F99D] text-lime-800 border-lime-200"
};
const statusIcons: Record<string, string> = {
  "Banco de Talentos": "⚪",
  "Selecionado": "🟢",
  "Entrevista rhello": "🔵",
  "Reprovado rhello": "🔴",
  "Aprovado rhello": "🟡",
  "Entrevistas Solicitante": "🟣",
  "Reprovado Solicitante": "🔴",
  "Aprovado Solicitante": "🟡",
  "Contratado": "✅"
};
export const CandidateCard = React.memo(function CandidateCard({
  candidato,
  onView,
  onEdit,
  onDelete,
  onLinkJob,
  viewMode = "grid"
}: CandidateCardProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };
  const isAvailable = candidato.disponibilidade_status !== 'não_disponível';
  return <Card 
    className={cn("bg-[#fffdf6] border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", !isAvailable && "opacity-70")}
    role="article"
    aria-label={`Candidato: ${candidato.nome_completo} - Status: ${candidato.status}${candidato.vaga_titulo ? ` - Vaga: ${candidato.vaga_titulo}` : ''}`}
  >
      <CardHeader className="pb-3 pt-4 px-4">
        {/* Header with avatar and status */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00141d] text-[#fffdf6] font-bold text-base flex-shrink-0">
            {getInitials(candidato.nome_completo)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#00141d] line-clamp-1 mb-2">
              {candidato.nome_completo}
            </h3>
            
            <Badge variant="outline" className={cn("text-sm font-bold rounded-md px-2 py-1 w-fit bg-[#faec3e]/20 text-[#00141d] border-[#faec3e] whitespace-nowrap")}>
              {candidato.status}
            </Badge>
          </div>

          {candidato.disponibilidade_status && <div className="flex-shrink-0">
              {candidato.disponibilidade_status === 'disponível' ? <Badge className="text-sm font-semibold rounded-full px-2 py-1 bg-[#C9F4C7] text-[#1B5E20] hover:bg-[#C9F4C7]/90 border-0">
                  Disponível
                </Badge> : candidato.disponibilidade_status === 'não_disponível' ? <Badge className="text-sm font-semibold rounded-full px-2 py-1 bg-[#FFD6D6] text-[#B71C1C] hover:bg-[#FFD6D6]/90 border-0">
                  Indisponível
                </Badge> : null}
            </div>}
        </div>

        {/* Job title if linked */}
        {candidato.vaga_titulo && <div className="mb-3">
            <Badge variant="outline" className="text-sm font-bold px-2 py-1 text-[#36404a] border-gray-300 bg-white">
              Vaga: {candidato.vaga_titulo}
            </Badge>
          </div>}
      </CardHeader>

      <CardContent className="space-y-2.5 px-4 pb-4">
        {/* Professional info */}
        {(candidato.nivel || candidato.area) && <div className="flex items-center gap-2 text-sm text-[#36404a]">
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {[candidato.nivel, candidato.area].filter(Boolean).join(" • ")}
            </span>
          </div>}

        {/* Email */}
        <div className="flex items-center gap-2 text-sm text-[#36404a]">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate text-base font-medium">{candidato.email}</span>
        </div>

        {/* Location */}
        {(candidato.cidade || candidato.estado) && <div className="flex items-center gap-2 text-sm text-[#36404a]">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-base font-medium">
              {[candidato.cidade, candidato.estado].filter(Boolean).join(", ")}
            </span>
          </div>}

        {/* Recruiter */}
        {candidato.recrutador && <div className="flex items-center gap-2 text-[#36404a]">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-base font-medium">{candidato.recrutador}</span>
          </div>}

        {/* Quick Actions */}
        <TooltipProvider>
          <div className="flex gap-1.5 pt-3 mt-3 border-t border-gray-200" role="group" aria-label="Ações do candidato">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex-1 hover:bg-[#faec3e]/20 hover:text-[#00141d] text-[#36404a] px-2" 
                  onClick={e => {
                    e.stopPropagation();
                    onView();
                  }}
                  aria-label={`Ver detalhes de ${candidato.nome_completo}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
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
                  className="h-8 flex-1 hover:bg-[#faec3e]/20 hover:text-[#00141d] text-[#36404a] px-2" 
                  onClick={e => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  aria-label={`Editar ${candidato.nome_completo}`}
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar</p>
              </TooltipContent>
            </Tooltip>

            {!candidato.vaga_relacionada_id && <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 flex-1 hover:bg-[#faec3e]/20 hover:text-[#00141d] text-[#36404a] px-2" 
                    onClick={e => {
                      e.stopPropagation();
                      onLinkJob();
                    }}
                    aria-label={`Vincular vaga a ${candidato.nome_completo}`}
                  >
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vincular vaga</p>
                </TooltipContent>
              </Tooltip>}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 px-2" 
                  onClick={e => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={`Excluir ${candidato.nome_completo}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>;
});
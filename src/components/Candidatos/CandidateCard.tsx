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
}

interface CandidateCardProps {
  candidato: Candidato;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkJob: () => void;
}

const statusColors: Record<string, string> = {
  "Banco de Talentos": "bg-muted/10 text-muted-foreground border-muted",
  "Selecionado": "bg-primary/10 text-primary border-primary/20",
  "Entrevista Rhello": "bg-warning/10 text-warning border-warning/20",
  "Enviado ao Cliente": "bg-info/10 text-info border-info/20",
  "Entrevista com Cliente": "bg-warning/10 text-warning border-warning/20",
  "Feedback Cliente": "bg-warning/10 text-warning border-warning/20",
  "Aguardando Retorno": "bg-muted/10 text-muted-foreground border-muted",
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
  "Banco de Talentos": "⚪",
};

export function CandidateCard({ candidato, onView, onEdit, onDelete, onLinkJob }: CandidateCardProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="group transition-all duration-200 hover:shadow-lg hover:scale-[1.01] bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {getInitials(candidato.nome_completo)}
            </div>
            <div className="flex-1">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium mb-1", statusColors[candidato.status] || statusColors["Banco de Talentos"])}
              >
                {statusIcons[candidato.status] || "⚪"} {candidato.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-card-foreground line-clamp-1">
          {candidato.nome_completo}
        </h3>
      </CardHeader>

      <CardContent className="space-y-3">
        {(candidato.nivel || candidato.area) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {[candidato.nivel, candidato.area].filter(Boolean).join(" – ")}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{candidato.email}</span>
        </div>

        {(candidato.cidade || candidato.estado) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {[candidato.cidade, candidato.estado].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {candidato.recrutador && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{candidato.recrutador}</span>
          </div>
        )}

        {/* Quick Actions */}
        <TooltipProvider>
          <div className="flex gap-1 pt-3 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 flex-1"
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
                  className="h-9 flex-1"
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
                    className="h-9 flex-1"
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
                  className="h-9 flex-1 text-destructive hover:text-destructive"
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

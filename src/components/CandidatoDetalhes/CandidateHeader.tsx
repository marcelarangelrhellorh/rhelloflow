import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MessageSquare, RefreshCw, Briefcase, MapPin, User, PartyPopper, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CandidateHeaderProps {
  nome: string;
  status: string;
  nivel: string | null;
  area: string | null;
  cidade: string | null;
  estado: string | null;
  recrutador: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onAddFeedback: () => void;
  onRelocate: () => void;
  onStatusChange: (newStatus: string) => void;
}

const ETAPAS_DISPONIVEIS = [
  "Banco de Talentos",
  "Selecionado",
  "Entrevista rhello",
  "Aprovado Rhello",
  "Reprovado Rhello",
  "Entrevistas Solicitante",
  "Aprovado Solicitante",
  "Reprovado Solicitante",
  "Contratado"
] as const;

const statusColors: Record<string, string> = {
  "Banco de Talentos": "bg-muted/10 text-muted-foreground border-muted",
  "Selecionado": "bg-primary/10 text-primary border-primary/20",
  "Entrevista rhello": "bg-warning/10 text-warning border-warning/20",
  "Entrevista Rhello": "bg-warning/10 text-warning border-warning/20",
  "Enviado ao Cliente": "bg-info/10 text-info border-info/20",
  "Entrevista com Cliente": "bg-warning/10 text-warning border-warning/20",
  "Entrevistas Solicitante": "bg-info/10 text-info border-info/20",
  "Feedback Cliente": "bg-warning/10 text-warning border-warning/20",
  "Aguardando Retorno": "bg-muted/10 text-muted-foreground border-muted",
  "Aprovado": "bg-success/10 text-success border-success/20",
  "Aprovado Rhello": "bg-success/10 text-success border-success/20",
  "Aprovado Solicitante": "bg-success/10 text-success border-success/20",
  "Contratado": "bg-success text-success-foreground border-success",
  "Declinou": "bg-destructive/10 text-destructive border-destructive/20",
  "Reprovado Cliente": "bg-destructive/10 text-destructive border-destructive/20",
  "Reprovado Rhello": "bg-destructive/10 text-destructive border-destructive/20",
  "Reprovado Solicitante": "bg-destructive/10 text-destructive border-destructive/20",
};

export function CandidateHeader({
  nome,
  status,
  nivel,
  area,
  cidade,
  estado,
  recrutador,
  onEdit,
  onDelete,
  onAddFeedback,
  onRelocate,
  onStatusChange,
}: CandidateHeaderProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const isContratado = status === "Contratado";

  return (
    <div className="space-y-3">
      {/* Banner de Contratação - mais compacto */}
      {isContratado && (
        <div className="rounded-lg bg-gradient-to-r from-success/20 via-success/10 to-success/20 border border-success p-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
              <PartyPopper className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Candidato Contratado!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          {/* Left Side - Candidate Info */}
          <div className="flex gap-3 flex-1 min-w-0">
            {/* Avatar - menor */}
            <div className={cn(
              "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl font-semibold",
              isContratado ? "bg-success/20 text-success ring-2 ring-success" : "bg-primary/10 text-primary"
            )}>
              {getInitials(nome)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-card-foreground truncate">{nome}</h1>
                <Badge
                  variant={isContratado ? "default" : "outline"}
                  className={cn(
                    "text-xs font-medium flex-shrink-0",
                    isContratado && "bg-success text-success-foreground hover:bg-success/90 border-success",
                    !isContratado && (statusColors[status] || statusColors["Banco de Talentos"])
                  )}
                >
                  {status}
                </Badge>
              </div>

              {/* Info compacta */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                {(nivel || area) && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{[nivel, area].filter(Boolean).join(" – ")}</span>
                  </div>
                )}
                
                {(cidade || estado) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{[cidade, estado].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                
                {recrutador && (
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>{recrutador}</span>
                  </div>
                )}
              </div>

              {/* Seletor de Etapa - mais compacto */}
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full sm:w-[260px] h-8 text-xs border-border bg-background hover:bg-accent/5 transition-colors">
                  <SelectValue>
                    <span className="text-muted-foreground">Etapa:</span>{" "}
                    <span className="font-medium text-foreground">{status}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {ETAPAS_DISPONIVEIS.map((etapa) => (
                    <SelectItem 
                      key={etapa} 
                      value={etapa}
                      className={cn(
                        "cursor-pointer text-sm",
                        etapa === status && "font-semibold"
                      )}
                    >
                      {etapa === status && "✓ "}{etapa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side - Action Buttons - mais compactos */}
          <div className="flex flex-wrap gap-1.5">
            <Button onClick={onEdit} size="sm" className="h-8 text-xs">
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>

            <Button onClick={onAddFeedback} variant="outline" size="sm" className="h-8 text-xs">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Feedback
            </Button>

            <Button onClick={onRelocate} variant="outline" size="sm" className="h-8 text-xs">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Realocar
            </Button>

            <Button onClick={onDelete} variant="destructive" size="sm" className="h-8 text-xs">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

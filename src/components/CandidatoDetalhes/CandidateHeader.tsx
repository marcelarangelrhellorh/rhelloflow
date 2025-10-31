import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MessageSquare, RefreshCw, Briefcase, MapPin, User, PartyPopper, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

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
}: CandidateHeaderProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const isContratado = status === "Contratado";

  return (
    <div className="space-y-4">
      {/* Banner de Contratação */}
      {isContratado && (
        <div className="rounded-lg bg-gradient-to-r from-success/20 via-success/10 to-success/20 border-2 border-success p-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-success flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Candidato Contratado!
              </h3>
              <p className="text-sm text-success/80">
                Parabéns! Este candidato foi contratado com sucesso.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left Side - Candidate Info */}
          <div className="flex gap-4">
            {/* Avatar */}
            <div className={cn(
              "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-semibold",
              isContratado ? "bg-success/20 text-success ring-2 ring-success" : "bg-primary/10 text-primary"
            )}>
              {getInitials(nome)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-card-foreground">{nome}</h1>
                <Badge
                  variant={isContratado ? "default" : "outline"}
                  className={cn(
                    "text-sm font-medium",
                    isContratado && "bg-success text-success-foreground hover:bg-success/90 border-success shadow-lg",
                    !isContratado && (statusColors[status] || statusColors["Banco de Talentos"])
                  )}
                >
                  {isContratado ? "✅" : "⚪"} {status}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {(nivel || area) && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{[nivel, area].filter(Boolean).join(" – ")}</span>
                  </div>
                )}
                
                {(cidade || estado) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{[cidade, estado].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                
                {recrutador && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{recrutador}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onEdit} size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>

            <Button onClick={onAddFeedback} variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Feedback
            </Button>

            <Button onClick={onRelocate} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Realocar
            </Button>

            <Button onClick={onDelete} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

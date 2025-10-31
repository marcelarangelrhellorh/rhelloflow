import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MessageSquare, RefreshCw, Briefcase, MapPin, User } from "lucide-react";
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

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left Side - Candidate Info */}
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {getInitials(nome)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-card-foreground">{nome}</h1>
              <Badge
                variant="outline"
                className={cn("text-sm font-medium", statusColors[status] || statusColors["Banco de Talentos"])}
              >
                {statusIcons[status] || "⚪"} {status}
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
  );
}

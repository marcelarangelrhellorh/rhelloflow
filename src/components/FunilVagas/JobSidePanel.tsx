import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Briefcase, Users, Calendar, Clock, ExternalLink, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
}

interface JobSidePanelProps {
  open: boolean;
  onClose: () => void;
  vaga: Vaga | null;
  diasEmAberto: number;
  onOpenFullDetails: () => void;
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

const priorityColors: Record<string, string> = {
  "Baixa": "bg-muted/10 text-muted-foreground border-muted",
  "Normal": "bg-info/10 text-info border-info/20",
  "Alta": "bg-warning/10 text-warning border-warning/20",
  "Urgente": "bg-destructive/10 text-destructive border-destructive/20",
};

export function JobSidePanel({
  open,
  onClose,
  vaga,
  diasEmAberto,
  onOpenFullDetails,
}: JobSidePanelProps) {
  if (!vaga) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{vaga.titulo}</SheetTitle>
          <SheetDescription>
            Visualização rápida da vaga
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Status & Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn("font-medium", statusColors[vaga.status] || statusColors["A iniciar"])}
            >
              {vaga.status}
            </Badge>
            {vaga.prioridade && (
              <Badge
                variant="outline"
                className={cn("font-medium", priorityColors[vaga.prioridade] || priorityColors["Normal"])}
              >
                <Target className="mr-1 h-3 w-3" />
                {vaga.prioridade}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="text-base font-medium text-card-foreground">{vaga.empresa}</p>
              </div>
            </div>

            {vaga.recrutador && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Recrutador</p>
                  <p className="text-base font-medium text-card-foreground">{vaga.recrutador}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Candidatos vinculados</p>
                <p className="text-base font-medium text-card-foreground">
                  {vaga.candidatos_count || 0} candidato{vaga.candidatos_count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Data de criação</p>
                <p className="text-base font-medium text-card-foreground">{formatDate(vaga.criado_em)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Dias em aberto</p>
                <p className="text-base font-medium text-card-foreground">
                  {diasEmAberto} {diasEmAberto === 1 ? "dia" : "dias"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">SLA previsto</p>
                <p className="text-base font-medium text-card-foreground">30 dias</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <Button onClick={onOpenFullDetails} className="w-full" size="lg">
            Abrir ficha completa da vaga
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

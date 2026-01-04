import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, RefreshCw, Briefcase, MapPin, PartyPopper, CheckCircle2, MessageCircle, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CandidateHeaderProps {
  nome: string;
  status: string;
  nivel: string | null;
  area: string | null;
  cidade: string | null;
  estado: string | null;
  vagaTitulo: string | null;
  vagaId: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onRelocate: () => void;
  onStatusChange: (newStatus: string) => void;
  onSendWhatsApp: () => void;
}
const ETAPAS_DISPONIVEIS = ["Banco de Talentos", "Triagem", "Assessment | Teste Técnico", "Entrevista", "Shortlist", "Reprovado", "Contratado"] as const;
const statusColors: Record<string, string> = {
  "Banco de Talentos": "bg-muted/10 text-muted-foreground border-muted",
  "Triagem": "bg-slate-100 text-slate-800 border-slate-200",
  "Assessment | Teste Técnico": "bg-purple-100 text-purple-800 border-purple-200",
  "Entrevista": "bg-blue-100 text-blue-800 border-blue-200",
  "Shortlist": "bg-amber-100 text-amber-800 border-amber-200",
  "Reprovado": "bg-red-100 text-red-800 border-red-200",
  "Contratado": "bg-success text-success-foreground border-success"
};
export function CandidateHeader({
  nome,
  status,
  nivel,
  area,
  cidade,
  estado,
  vagaTitulo,
  vagaId,
  onEdit,
  onDelete,
  onRelocate,
  onStatusChange,
  onSendWhatsApp
}: CandidateHeaderProps) {
  const navigate = useNavigate();
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const handleStatusChangeWithValidation = (newStatus: string) => {
    // Se está no Banco de Talentos e não tem vaga vinculada, bloquear mudança
    if (status === "Banco de Talentos" && !vagaId && newStatus !== "Banco de Talentos") {
      toast.warning("Vincule o candidato a uma vaga antes de movê-lo para outra etapa", {
        description: "Use o botão 'Realocar' para vincular a uma vaga primeiro.",
        duration: 5000,
      });
      return;
    }
    onStatusChange(newStatus);
  };
  const isContratado = status === "Contratado";
  return <div className="space-y-4">
      {/* Banner de Contratação - mais elegante */}
      {isContratado && <div className="rounded-lg bg-gradient-to-r from-success/15 via-success/10 to-success/15 border-2 border-success/40 p-4 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Candidato Contratado!
              </p>
              <p className="text-sm text-success/80">
                Parabéns! Este candidato foi contratado com sucesso.
              </p>
            </div>
          </div>
        </div>}

      <div className="rounded-lg border dark:border-secondary-text-light/20 bg-white dark:bg-background-dark p-6 shadow-md border-gray-400">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          {/* Left Side - Candidate Info */}
          <div className="flex gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className={cn("flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold", isContratado ? "bg-success/20 text-success ring-2 ring-success" : "bg-primary/10 text-primary")}>
              {getInitials(nome)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h1 className="text-primary-text-light dark:text-primary-text-dark font-black tracking-tight truncate text-2xl">{nome}</h1>
                <Badge variant={isContratado ? "default" : "outline"} className={cn("text-base font-semibold flex-shrink-0", isContratado && "bg-success text-success-foreground hover:bg-success/90 border-success", !isContratado && (statusColors[status] || statusColors["Banco de Talentos"]))}>
                  {status}
                </Badge>
              </div>

              {/* Info compacta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-secondary-text-light dark:text-secondary-text-dark mb-3">
                {(nivel || area) && <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-semibold">{[nivel, area].filter(Boolean).join(" – ")}</span>
                  </div>}
                
                {(cidade || estado) && <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="font-semibold">{[cidade, estado].filter(Boolean).join(", ")}</span>
                  </div>}

                {/* Vaga vinculada */}
                {vagaId && vagaTitulo ? (
                  <button 
                    onClick={() => navigate(`/vagas/${vagaId}`)}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="font-semibold">{vagaTitulo}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Link2Off className="h-4 w-4" />
                    <span className="font-medium italic">Sem vaga vinculada</span>
                  </div>
                )}
              </div>

              {/* Seletor de Etapa */}
              <Select value={status} onValueChange={handleStatusChangeWithValidation}>
                <SelectTrigger className="w-full sm:w-[280px] h-10 text-base border-gray-200 dark:border-secondary-text-light/20 bg-white dark:bg-background-dark hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                  <SelectValue>
                    <span className="text-secondary-text-light dark:text-secondary-text-dark">Etapa:</span>{" "}
                    <span className="font-semibold text-primary-text-light dark:text-primary-text-dark">{status}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-background-dark border-gray-200 dark:border-secondary-text-light/20 z-50">
                  {ETAPAS_DISPONIVEIS.map(etapa => <SelectItem key={etapa} value={etapa} className={cn("cursor-pointer", etapa === status && "font-bold bg-primary/10")}>
                      {etapa === status && "✓ "}{etapa}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSendWhatsApp} variant="outline" className="font-semibold border-gray-200 dark:border-secondary-text-light/20 text-success hover:bg-success/10 text-sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>

            <Button onClick={onEdit} className="font-semibold text-sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>

            <Button onClick={onRelocate} variant="outline" className="font-semibold border-gray-200 dark:border-secondary-text-light/20 text-sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Realocar
            </Button>

            <Button onClick={onDelete} variant="destructive" className="font-semibold text-sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>;
}
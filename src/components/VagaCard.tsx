import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Briefcase, User, MoreVertical, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";

interface VagaCardProps {
  vaga: {
    id: string;
    titulo: string;
    empresa: string;
    recrutador: string | null;
    status: string;
    criado_em: string | null;
    candidatos_count?: number;
  };
  draggable?: boolean;
  onDragStart?: () => void;
  onClick?: () => void;
}

const statusProgressMap: Record<string, number> = {
  "A iniciar": 10,
  "Discovery": 20,
  "Triagem": 25,
  "Entrevistas Rhello": 40,
  "Aguardando retorno do cliente": 50,
  "Apresentação de Candidatos": 60,
  "Entrevista cliente": 75,
  "Em processo de contratação": 85,
  "Concluído": 100,
  "Cancelada": 0,
};

const getStatusColor = (status: string): string => {
  if (status === "Concluído") return "bg-success text-success-foreground";
  if (status === "Cancelada") return "bg-destructive/10 text-destructive";
  if (status === "A iniciar") return "bg-info/10 text-info";
  return "bg-success text-success-foreground";
};

const getStatusIndicator = (status: string) => {
  if (status === "Concluído") return "🟢";
  if (status === "Cancelada") return "🔴";
  return "🟢";
};

export function VagaCard({ vaga, draggable = false, onDragStart, onClick }: VagaCardProps) {
  const navigate = useNavigate();
  const progress = statusProgressMap[vaga.status] || 0;
  const daysOpen = vaga.criado_em ? getBusinessDaysFromNow(vaga.criado_em) : 0;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/vagas/${vaga.id}`);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/vagas/${vaga.id}`);
  };

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={handleClick}
      className="cursor-pointer hover:shadow-lg transition-all bg-card border border-border overflow-hidden"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground leading-tight pr-2 line-clamp-2">
            {vaga.titulo}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Badge */}
        <div>
          <Badge className={`${getStatusColor(vaga.status)} border-0`}>
            <span className="mr-1">{getStatusIndicator(vaga.status)}</span>
            {vaga.status}
          </Badge>
        </div>

        {/* Cliente e Recrutador */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium truncate">{vaga.empresa}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Recrutador</p>
              <p className="text-sm font-medium truncate">{vaga.recrutador || "Não atribuído"}</p>
            </div>
          </div>
        </div>

        {/* Progresso do Pipeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Progresso do Pipeline</p>
            <p className="text-sm font-semibold text-primary">{vaga.status} - {progress}%</p>
          </div>
          <Progress value={progress} className="h-2 bg-secondary [&>div]:bg-primary" />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{vaga.candidatos_count || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total de Candidatos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{daysOpen}</div>
            <div className="text-xs text-muted-foreground mt-1">Dias em Aberto</div>
          </div>
        </div>

        {/* Botão Ver Detalhes */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          onClick={handleViewDetails}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

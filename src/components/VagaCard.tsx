import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Briefcase, User, MoreVertical, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { formatSalaryRange } from "@/lib/salaryUtils";

interface VagaCardProps {
  vaga: {
    id: string;
    titulo: string;
    empresa: string;
    recrutador: string | null;
    status: string;
    criado_em: string | null;
    candidatos_count?: number;
    salario_min?: number | null;
    salario_max?: number | null;
    salario_modalidade?: string | null;
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
      className="cursor-pointer hover-lift card-shadow bg-white border border-[#E5E7EB] overflow-hidden rounded-2xl"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-[#00141D] leading-tight pr-2 line-clamp-2">
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
          <Badge className={`${getStatusColor(vaga.status)} border-0 font-bold rounded-full px-3 py-1`}>
            <span className="mr-1">{getStatusIndicator(vaga.status)}</span>
            {vaga.status}
          </Badge>
        </div>

        {/* Cliente e Recrutador */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[#00141D]/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-[#00141D]/80" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#00141D]/60">Cliente</p>
              <p className="text-sm font-semibold truncate text-[#00141D]">{vaga.empresa}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[#F9EC3F]/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-[#00141D]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#00141D]/60">Recrutador</p>
              <p className="text-sm font-semibold truncate text-[#00141D]">{vaga.recrutador || "Não atribuído"}</p>
            </div>
          </div>
        </div>

        {/* Salary Range */}
        {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && (
          <div className="pt-2 border-t border-[#E5E7EB]">
            <p className="text-xs text-[#00141D]/60 mb-1">Faixa Salarial</p>
            <p className="text-sm font-bold text-[#00141D]">
              {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
            </p>
          </div>
        )}

        {/* Progresso do Pipeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#00141D]">Progresso do Pipeline</p>
            <p className="text-sm font-bold text-[#00141D]">{progress}%</p>
          </div>
          <Progress value={progress} className="h-3 bg-[#E5E7EB] [&>div]:bg-[#F9EC3F] [&>div]:transition-all [&>div]:duration-300" />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00141D]">{vaga.candidatos_count || 0}</div>
            <div className="text-xs text-[#00141D]/60 mt-1 font-medium">Total de Candidatos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00141D]">{daysOpen}</div>
            <div className="text-xs text-[#00141D]/60 mt-1 font-medium">Dias em Aberto</div>
          </div>
        </div>

        {/* Botão Ver Detalhes */}
        <Button 
          className="w-full bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold rounded-xl transition-all duration-200 hover:scale-[1.03] shadow-sm"
          onClick={handleViewDetails}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

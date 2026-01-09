import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel?: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
  area?: string | null;
  salario_min?: number | null;
  salario_max?: number | null;
  salario_modalidade?: string | null;
  dias_etapa_atual?: number;
}

interface JobCardProps {
  vaga: Vaga;
  diasEmAberto: number;
  diasEtapaAtual: number;
  progresso: number;
  onDragStart: () => void;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  isDragging?: boolean;
  stageColor?: { bg: string; text: string; columnBg: string };
}

// Cores dos status conforme especificação
const statusColors: Record<string, { bg: string; text: string }> = {
  "A iniciar": { bg: "#2E7D32", text: "#FFFFFF" },
  "Discovery": { bg: "#1976D2", text: "#FFFFFF" },
  "Divulgação": { bg: "#0288D1", text: "#FFFFFF" },
  "Triagem": { bg: "#512DA8", text: "#FFFFFF" },
  "Entrevistas rhello": { bg: "#F57C00", text: "#FFFFFF" },
  "Aguardando retorno do cliente": { bg: "#8D6E63", text: "#FFFFFF" },
  "Apresentação de candidatos": { bg: "#0097A7", text: "#FFFFFF" },
  "Entrevistas solicitante": { bg: "#5C6BC0", text: "#FFFFFF" },
  "Em processo de contratação": { bg: "#00796B", text: "#FFFFFF" },
  "Concluída": { bg: "#2E7D32", text: "#FFFFFF" },
  "Congelada": { bg: "#455A64", text: "#FFFFFF" },
  "Pausada": { bg: "#757575", text: "#FFFFFF" },
  "Cancelada": { bg: "#D32F2F", text: "#FFFFFF" },
};

// Cores de prioridade
const priorityColors: Record<string, string> = {
  "Baixa": "bg-gray-100 text-gray-600 border-gray-200",
  "Alta": "bg-orange-100 text-orange-700 border-orange-200",
  "Crítica": "bg-red-100 text-red-700 border-red-200",
};

// Função para obter iniciais do nome
const getInitials = (name: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

// Função para formatar salário
const formatSalaryRange = (min?: number | null, max?: number | null, modalidade?: string | null): string => {
  if (!min && !max) return "";
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  let salaryText = "";
  if (min && max) {
    salaryText = `${formatCurrency(min)} - ${formatCurrency(max)}`;
  } else if (min) {
    salaryText = `A partir de ${formatCurrency(min)}`;
  } else if (max) {
    salaryText = `Até ${formatCurrency(max)}`;
  }

  return salaryText;
};

export const JobCard = React.memo(function JobCard({
  vaga,
  diasEmAberto,
  diasEtapaAtual,
  progresso,
  onDragStart,
  onView,
  onEdit,
  onDuplicate,
  onClose,
  isDragging,
  stageColor,
}: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: vaga.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColor = statusColors[vaga.status] || { bg: "#757575", text: "#FFFFFF" };
  const salaryRange = formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card
        className={cn(
          "relative cursor-pointer transition-all duration-200 group overflow-hidden",
          "bg-white border border-gray-200 rounded-lg shadow-sm",
          "hover:shadow-md hover:scale-[1.01]"
        )}
        onClick={onView}
      >
        <div className="relative p-5 space-y-4" {...attributes} {...listeners}>
          {/* Header: Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-[#00141D] leading-tight flex-1 line-clamp-2">
              {vaga.titulo}
            </h3>
          </div>

          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge 
              className="border font-semibold rounded-md px-2 py-0.5 text-xs"
              style={{
                backgroundColor: statusColor.bg,
                color: statusColor.text,
                borderColor: statusColor.bg
              }}
            >
              {vaga.status}
            </Badge>
            {vaga.prioridade && vaga.prioridade !== 'Normal' && (
              <Badge className={cn(
                "border font-semibold rounded-md px-2 py-0.5 text-xs flex items-center gap-1",
                priorityColors[vaga.prioridade] || "bg-gray-100 text-gray-600 border-gray-200"
              )}>
                {(vaga.prioridade === 'Alta' || vaga.prioridade === 'Crítica') && (
                  <Target className="h-3 w-3" />
                )}
                {vaga.prioridade}
              </Badge>
            )}
            {vaga.confidencial && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border font-semibold rounded-md px-2 py-0.5 text-xs flex items-center gap-1">
                <EyeOff className="h-3 w-3" />
                Confidencial
              </Badge>
            )}
          </div>

          {/* Two-column layout: Cliente and Recrutador */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[#36404A] text-sm font-medium">Cliente</p>
              <p className="text-sm font-semibold text-[#00141D] line-clamp-1">{vaga.empresa}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[#36404A] text-sm font-medium">Recrutador</p>
              <p className="text-sm font-semibold text-[#00141D] line-clamp-1">
                {vaga.recrutador || "Não atribuído"}
              </p>
            </div>
          </div>

          {/* Faixa Salarial */}
          {salaryRange && (
            <div className="space-y-1">
              <p className="text-[#36404A] text-sm font-medium">Faixa Salarial</p>
              <p className="text-sm font-semibold text-[#00141D]">
                {salaryRange}
              </p>
            </div>
          )}

          {/* Pipeline Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[#36404A] text-sm font-medium">Progresso do Pipeline</p>
              <p className="text-xs font-bold text-[#00141D]">{progresso}%</p>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-300"
                style={{
                  width: `${progresso}%`,
                  backgroundColor: "#FFCD00"
                }}
              />
            </div>
          </div>

          {/* Bottom Metrics */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <p className="text-2xl font-bold text-[#00141D]">{vaga.candidatos_count || 0}</p>
                <p className="text-[#36404A] text-sm font-medium">Total de Candidatos</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-2xl font-bold text-[#00141D]">{diasEmAberto}</p>
                <p className="text-[#36404A] text-sm font-medium">Dias em Aberto</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-2xl font-bold text-[#00141D]">{diasEtapaAtual}</p>
                <p className="text-[#36404A] text-sm font-medium">Dias na Etapa</p>
              </div>
            </div>

            {/* Recruiter Avatar */}
            {vaga.recrutador && (
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm"
                style={{
                  backgroundColor: "#00141D",
                  color: "#FFFFFF"
                }}
                title={vaga.recrutador}
              >
                {getInitials(vaga.recrutador)}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});

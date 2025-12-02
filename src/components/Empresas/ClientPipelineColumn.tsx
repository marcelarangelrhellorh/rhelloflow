import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClientStage } from "@/lib/clientStages";
import { ClientFunnelCard } from "./ClientFunnelCard";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  setor: string | null;
  porte: string | null;
  status: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  data_primeiro_contato: string | null;
}

interface ClientPipelineColumnProps {
  stage: ClientStage;
  empresas: Empresa[];
  onClientClick: (empresa: Empresa) => void;
}

export function ClientPipelineColumn({
  stage,
  empresas,
  onClientClick,
}: ClientPipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.slug,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] h-full rounded-lg transition-all duration-200",
        "border border-gray-200 shadow-sm bg-white",
        isOver && "border-2 border-[#FFCD00] ring-2 ring-[#FFCD00]/20"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 border-b border-gray-200 rounded-t-lg",
          stage.color.columnBg
        )}
      >
        <h3 className="font-semibold text-sm text-[#00141d]">{stage.name}</h3>
        <Badge
          variant="secondary"
          className={cn("text-xs font-medium", stage.color.bg, stage.color.text)}
        >
          {empresas.length}
        </Badge>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {empresas.map((empresa) => (
          <ClientFunnelCard
            key={empresa.id}
            empresa={empresa}
            stageColor={stage.color}
            onClick={() => onClientClick(empresa)}
          />
        ))}
        {empresas.length === 0 && (
          <div className="text-center py-8 text-sm text-[#36404a]">
            Nenhum cliente
          </div>
        )}
      </div>
    </div>
  );
}

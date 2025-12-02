import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientStage } from "@/lib/clientStages";
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
interface ClientFunnelCardProps {
  empresa: Empresa;
  stageColor: ClientStage["color"];
  onClick: () => void;
  isDragging?: boolean;
}
export function ClientFunnelCard({
  empresa,
  stageColor,
  onClick,
  isDragging
}: ClientFunnelCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({
    id: empresa.id
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined;
  return <Card ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick} className={cn("p-3 cursor-pointer transition-all duration-200 bg-[#fffdf6] border border-gray-200", "hover:shadow-md hover:border-[#ffcd00]", isDragging && "opacity-50 shadow-lg rotate-2")}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[#00141d] line-clamp-1">
              {empresa.nome}
            </h3>
            {empresa.cnpj && <p className="text-xs text-[#36404a] mt-0.5 font-semibold">
                CNPJ: {empresa.cnpj}
              </p>}
          </div>
          <Building2 className="h-4 w-4 text-[#36404a] flex-shrink-0" />
        </div>

        {/* Info */}
        <div className="space-y-1">
          {empresa.setor && <Badge variant="secondary" className={cn("text-xs font-medium", stageColor.bg, stageColor.text)}>
              {empresa.setor}
            </Badge>}

          {empresa.porte && <p className="text-xs text-[#36404a] font-semibold">
              <span className="font-semibold">Porte:</span> {empresa.porte}
            </p>}

          {(empresa.cidade || empresa.estado) && <div className="flex items-center gap-1 text-xs text-[#36404a]">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">
                {empresa.cidade}
                {empresa.cidade && empresa.estado && ", "}
                {empresa.estado}
              </span>
            </div>}

          {empresa.telefone && <div className="flex items-center gap-1 text-xs text-[#36404a]">
              <Phone className="h-3 w-3" />
              <span className="font-semibold">{empresa.telefone}</span>
            </div>}

          {empresa.email && <div className="flex items-center gap-1 text-xs text-[#36404a]">
              <Mail className="h-3 w-3" />
              <span className="line-clamp-1">{empresa.email}</span>
            </div>}
        </div>
      </div>
    </Card>;
}
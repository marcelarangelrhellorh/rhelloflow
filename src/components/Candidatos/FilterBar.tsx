import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  recrutadorFilter: string;
  onRecrutadorChange: (value: string) => void;
  areaFilter: string;
  onAreaChange: (value: string) => void;
  nivelFilter: string;
  onNivelChange: (value: string) => void;
  disponibilidadeFilter: string;
  onDisponibilidadeChange: (value: string) => void;
  recrutadores: string[];
  areas: string[];
  niveis: string[];
}

const statusOptions = [
  "Banco de Talentos",
  "Selecionado",
  "Entrevista Rhello",
  "Enviado ao Cliente",
  "Entrevista com Cliente",
  "Feedback Cliente",
  "Aguardando Retorno",
  "Aprovado",
  "Declinou",
  "Reprovado Cliente"
];

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  recrutadorFilter,
  onRecrutadorChange,
  areaFilter,
  onAreaChange,
  nivelFilter,
  onNivelChange,
  disponibilidadeFilter,
  onDisponibilidadeChange,
  recrutadores,
  areas,
  niveis,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border pb-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="🔍 Buscar candidatos por nome, e-mail ou cidade..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={disponibilidadeFilter} onValueChange={onDisponibilidadeChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="disponível">✅ Disponíveis</SelectItem>
            <SelectItem value="não_disponível">❌ Não disponíveis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={recrutadorFilter} onValueChange={onRecrutadorChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Recrutador" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos</SelectItem>
            {recrutadores.map((rec) => (
              <SelectItem key={rec} value={rec}>
                {rec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={areaFilter} onValueChange={onAreaChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todas as áreas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={nivelFilter} onValueChange={onNivelChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos os níveis</SelectItem>
            {niveis.map((nivel) => (
              <SelectItem key={nivel} value={nivel}>
                {nivel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

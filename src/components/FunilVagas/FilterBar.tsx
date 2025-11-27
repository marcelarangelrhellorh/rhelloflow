import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Building2, ListFilter, Tag } from "lucide-react";

interface StatusRef {
  slug: string;
  label: string;
  color: string;
  order: number;
}

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  recrutadorFilter: string;
  onRecrutadorChange: (value: string) => void;
  clienteFilter: string;
  onClienteChange: (value: string) => void;
  areaFilter: string;
  onAreaChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  ordenacao: string;
  onOrdenacaoChange: (value: string) => void;
  recrutadores: string[];
  clientes: string[];
  areas: string[];
  statusOptions: StatusRef[];
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  recrutadorFilter,
  onRecrutadorChange,
  clienteFilter,
  onClienteChange,
  areaFilter,
  onAreaChange,
  statusFilter,
  onStatusChange,
  ordenacao,
  onOrdenacaoChange,
  recrutadores,
  clientes,
  areas,
  statusOptions,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full pb-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#36404A]" />
        <Input
          placeholder="Buscar vaga..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm bg-white border-gray-200 text-[#00141D] placeholder:text-[#36404A]"
        />
      </div>

      <Select value={recrutadorFilter} onValueChange={onRecrutadorChange}>
        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-[140px] bg-white border-gray-200 text-sm">
          <User className="h-4 w-4 mr-2 text-[#36404A]" />
          <SelectValue placeholder="Recrutador" />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="all">Todos recrutadores</SelectItem>
          {recrutadores.map((rec) => (
            <SelectItem key={rec} value={rec}>
              {rec}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={clienteFilter} onValueChange={onClienteChange}>
        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-[140px] bg-white border-gray-200 text-sm">
          <Building2 className="h-4 w-4 mr-2 text-[#36404A]" />
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="all">Todos clientes</SelectItem>
          {clientes.map((cli) => (
            <SelectItem key={cli} value={cli}>
              {cli}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-[140px] bg-white border-gray-200 text-sm">
          <Tag className="h-4 w-4 mr-2 text-[#36404A]" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="all">Todos os status</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status.slug} value={status.label}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={ordenacao} onValueChange={onOrdenacaoChange}>
        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-[140px] bg-white border-gray-200 text-sm">
          <ListFilter className="h-4 w-4 mr-2 text-[#36404A]" />
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="recentes">Mais recentes</SelectItem>
          <SelectItem value="antigas">Mais antigas</SelectItem>
          <SelectItem value="candidatos">Mais candidatos</SelectItem>
          <SelectItem value="dias">Dias em aberto</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

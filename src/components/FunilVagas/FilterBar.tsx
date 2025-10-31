import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Building2, ListFilter } from "lucide-react";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  recrutadorFilter: string;
  onRecrutadorChange: (value: string) => void;
  clienteFilter: string;
  onClienteChange: (value: string) => void;
  areaFilter: string;
  onAreaChange: (value: string) => void;
  ordenacao: string;
  onOrdenacaoChange: (value: string) => void;
  recrutadores: string[];
  clientes: string[];
  areas: string[];
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
  ordenacao,
  onOrdenacaoChange,
  recrutadores,
  clientes,
  areas,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 overflow-x-auto pb-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#36404A]" />
        <Input
          placeholder="Buscar vaga..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm bg-white border-gray-200 text-[#00141D] placeholder:text-[#36404A]"
        />
      </div>

      <Select value={recrutadorFilter} onValueChange={onRecrutadorChange}>
        <SelectTrigger className="h-9 w-full sm:w-[180px] bg-white border-gray-200 text-sm">
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
        <SelectTrigger className="h-9 w-full sm:w-[180px] bg-white border-gray-200 text-sm">
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

      <Select value={ordenacao} onValueChange={onOrdenacaoChange}>
        <SelectTrigger className="h-9 w-full sm:w-[180px] bg-white border-gray-200 text-sm">
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

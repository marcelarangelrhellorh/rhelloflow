import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 min-w-[250px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="🔍 Buscar vaga..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={recrutadorFilter} onValueChange={onRecrutadorChange}>
        <SelectTrigger className="w-full sm:w-[200px] bg-background">
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

      <Select value={clienteFilter} onValueChange={onClienteChange}>
        <SelectTrigger className="w-full sm:w-[200px] bg-background">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="all">Todos</SelectItem>
          {clientes.map((cli) => (
            <SelectItem key={cli} value={cli}>
              {cli}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={areaFilter} onValueChange={onAreaChange}>
        <SelectTrigger className="w-full sm:w-[200px] bg-background">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="all">Todas</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={ordenacao} onValueChange={onOrdenacaoChange}>
        <SelectTrigger className="w-full sm:w-[200px] bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="recentes">Mais recentes</SelectItem>
          <SelectItem value="antigas">Mais antigas</SelectItem>
          <SelectItem value="candidatos">Maior nº de candidatos</SelectItem>
          <SelectItem value="dias">Dias em aberto</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

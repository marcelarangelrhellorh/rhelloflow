import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Briefcase } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  vagaFilter: string;
  onVagaChange: (value: string) => void;
  recrutadorFilter: string;
  onRecrutadorChange: (value: string) => void;
  vagas: { id: string; titulo: string }[];
  recrutadores: string[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  vagaFilter,
  onVagaChange,
  recrutadorFilter,
  onRecrutadorChange,
  vagas,
  recrutadores,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 overflow-x-auto pb-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#36404A]" />
        <Input
          placeholder="Buscar candidato..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm bg-white border-gray-200 text-[#00141D] placeholder:text-[#36404A]"
        />
      </div>

      <Select value={vagaFilter} onValueChange={onVagaChange}>
        <SelectTrigger className="h-9 w-full sm:w-[180px] bg-white border-gray-200 text-sm">
          <Briefcase className="h-4 w-4 mr-2 text-[#36404A]" />
          <SelectValue placeholder="Vaga" />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="all">Todas as vagas</SelectItem>
          {vagas.map((vaga) => (
            <SelectItem key={vaga.id} value={vaga.id}>
              {vaga.titulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
    </div>
  );
}
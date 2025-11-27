import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Briefcase, Building2 } from "lucide-react";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  disponibilidadeFilter: string;
  onDisponibilidadeChange: (value: string) => void;
  vagaFilter: string;
  onVagaChange: (value: string) => void;
  clienteFilter: string;
  onClienteChange: (value: string) => void;
  vagas: { id: string; titulo: string }[];
  clientes: string[];
}

const statusOptions = [
  "Banco de Talentos",
  "Selecionado",
  "Entrevista rhello",
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
  disponibilidadeFilter,
  onDisponibilidadeChange,
  vagaFilter,
  onVagaChange,
  clienteFilter,
  onClienteChange,
  vagas,
  clientes,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border pb-4 w-full">
      <div className="flex flex-col gap-3 sm:flex-row w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="🔍 Buscar candidatos por nome, e-mail ou cidade..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-base font-semibold"
          />
        </div>

        <Select value={disponibilidadeFilter} onValueChange={onDisponibilidadeChange}>
          <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] bg-background text-base font-semibold">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all" className="text-base font-semibold">Todos</SelectItem>
            <SelectItem value="disponível" className="text-base font-semibold">✅ Disponíveis</SelectItem>
            <SelectItem value="não_disponível" className="text-base font-semibold">❌ Não disponíveis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] bg-background text-base font-semibold">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all" className="text-base font-semibold">Todos os status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status} className="text-base font-semibold">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={vagaFilter} onValueChange={onVagaChange}>
          <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] bg-background text-base font-semibold">
            <Briefcase className="h-4 w-4 mr-2 text-[#36404A]" />
            <SelectValue placeholder="Vaga" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all" className="text-base font-semibold">Todas as vagas</SelectItem>
            {vagas.map((vaga) => (
              <SelectItem key={vaga.id} value={vaga.id} className="text-base font-semibold">
                {vaga.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={onClienteChange}>
          <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] bg-background text-base font-semibold">
            <Building2 className="h-4 w-4 mr-2 text-[#36404A]" />
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all" className="text-base font-semibold">Todos os clientes</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente} value={cliente} className="text-base font-semibold">
                {cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

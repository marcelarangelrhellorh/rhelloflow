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

        <Select value={vagaFilter} onValueChange={onVagaChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <Briefcase className="h-4 w-4 mr-2 text-[#36404A]" />
            <SelectValue placeholder="Vaga" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todas as vagas</SelectItem>
            {vagas.map((vaga) => (
              <SelectItem key={vaga.id} value={vaga.id}>
                {vaga.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={onClienteChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <Building2 className="h-4 w-4 mr-2 text-[#36404A]" />
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente} value={cliente}>
                {cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

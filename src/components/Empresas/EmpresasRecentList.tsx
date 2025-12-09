import { Card } from "@/components/ui/card";
import { Clock, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
interface Empresa {
  id: string;
  nome: string;
  created_at: string;
  status: string | null;
}
interface EmpresasRecentListProps {
  empresas: Empresa[];
  onViewDetails: (empresa: Empresa) => void;
}
export function EmpresasRecentList({
  empresas,
  onViewDetails
}: EmpresasRecentListProps) {
  const recentEmpresas = [...empresas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  if (recentEmpresas.length === 0) {
    return null;
  }
  return <Card className="p-4 border-gray-300 shadow-md">
      <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#00a6ff]" />
        Adicionados Recentemente
      </h3>
      <div className="space-y-2">
        {recentEmpresas.map(empresa => <button key={empresa.id} onClick={() => onViewDetails(empresa)} className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {empresa.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(empresa.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
                </p>
              </div>
            </div>
          </button>)}
      </div>
    </Card>;
}
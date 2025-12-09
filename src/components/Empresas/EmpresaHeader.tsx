import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Trash2, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmpresaHeaderProps {
  nome: string;
  status: string | null;
  dataPrimeiroContato: string | null;
  createdAt: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

export function EmpresaHeader({
  nome,
  status,
  dataPrimeiroContato,
  createdAt,
  onEdit,
  onDelete,
}: EmpresaHeaderProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "ativo":
        return "bg-green-100 text-green-800 border-green-200";
      case "inativo":
        return "bg-red-100 text-red-800 border-red-200";
      case "prospect":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const clienteSince = dataPrimeiroContato || createdAt;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/gerenciar-empresas")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{nome}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={getStatusColor(status)}>
                {(status || "ativo").charAt(0).toUpperCase() + (status || "ativo").slice(1)}
              </Badge>
              {clienteSince && (
                <span className="text-sm text-muted-foreground">
                  Cliente desde{" "}
                  {format(new Date(clienteSince), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>
    </div>
  );
}

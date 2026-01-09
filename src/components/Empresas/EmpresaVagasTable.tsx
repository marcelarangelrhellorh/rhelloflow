import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { JOB_STAGES } from "@/lib/jobStages";

interface Vaga {
  id: string;
  titulo: string;
  status: string;
  status_slug: string;
  criado_em: string;
}

interface EmpresaVagasTableProps {
  vagas: Vaga[] | undefined;
  isLoading?: boolean;
  empresaId?: string;
  empresaNome?: string;
}

export function EmpresaVagasTable({
  vagas,
  isLoading,
  empresaId,
  empresaNome
}: EmpresaVagasTableProps) {
  const navigate = useNavigate();
  
  const getStatusLabel = (slug: string) => {
    const stage = JOB_STAGES.find(s => s.slug === slug);
    return stage?.name || slug;
  };
  
  const getStatusColor = (slug: string) => {
    if (slug === "concluida") return "bg-green-100 text-green-800";
    if (slug === "cancelada") return "bg-red-100 text-red-800";
    if (slug === "congelada" || slug === "pausada") return "bg-gray-100 text-gray-800";
    return "bg-blue-100 text-blue-800";
  };

  const handleCreateJob = () => {
    const params = new URLSearchParams();
    if (empresaId) params.set("empresa_id", empresaId);
    if (empresaNome) params.set("empresa", empresaNome);
    navigate(`/vagas/nova?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-300 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Histórico de Vagas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#ffcd00]" />
            Histórico de Vagas ({vagas?.length || 0})
          </CardTitle>
          {empresaId && (
            <Button 
              size="sm" 
              onClick={handleCreateJob}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Nova Vaga
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!vagas || vagas.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-base text-muted-foreground mb-4">
              Nenhuma vaga registrada para esta empresa.
            </p>
            {empresaId && (
              <Button 
                variant="outline" 
                onClick={handleCreateJob}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar primeira vaga
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Título</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vagas.map(vaga => (
                <TableRow key={vaga.id}>
                  <TableCell className="text-base font-medium">{vaga.titulo}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(vaga.status_slug)}>
                      {getStatusLabel(vaga.status_slug)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {format(new Date(vaga.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate(`/vagas/${vaga.id}`)} 
                      className="hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
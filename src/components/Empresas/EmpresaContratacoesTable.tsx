import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
interface Contratacao {
  id: string;
  nome_completo: string;
  vaga_relacionada_id: string;
  criado_em: string;
  hired_at: string | null;
}
interface EmpresaContratacoesTableProps {
  contratacoes: Contratacao[] | undefined;
  isLoading?: boolean;
}
export function EmpresaContratacoesTable({
  contratacoes,
  isLoading
}: EmpresaContratacoesTableProps) {
  const navigate = useNavigate();
  if (isLoading) {
    return <Card className="border border-gray-300 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Histórico de Contratações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-[#ffcd00]" />
          Histórico de Contratações ({contratacoes?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!contratacoes || contratacoes.length === 0 ? <p className="text-base text-muted-foreground text-center py-4">
            Nenhuma contratação registrada para esta empresa.
          </p> : <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Candidato</TableHead>
                <TableHead className="font-semibold">Data Contratação</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratacoes.map(contratacao => <TableRow key={contratacao.id}>
                  <TableCell className="text-base font-medium">
                    {contratacao.nome_completo}
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {contratacao.hired_at ? format(new Date(contratacao.hired_at), "dd/MM/yyyy", {
                locale: ptBR
              }) : format(new Date(contratacao.criado_em), "dd/MM/yyyy", {
                locale: ptBR
              })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/candidatos/${contratacao.id}`)} className="hover:bg-muted">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>;
}
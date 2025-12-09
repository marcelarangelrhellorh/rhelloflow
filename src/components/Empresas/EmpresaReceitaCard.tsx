import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, CheckCircle2, XCircle, Calendar, FileText, Banknote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Empresa } from "@/hooks/data/useEmpresaQuery";
interface AtividadeEconomica {
  code: string;
  text: string;
}
interface EmpresaReceitaCardProps {
  empresa: Empresa;
}
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
};
export function EmpresaReceitaCard({
  empresa
}: EmpresaReceitaCardProps) {
  if (!empresa.situacao_cadastral) return null;
  const atividadePrincipal = empresa.atividade_principal as AtividadeEconomica[] || [];
  const atividadesSecundarias = empresa.atividades_secundarias as AtividadeEconomica[] || [];
  return <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Factory className="h-5 w-5 text-[#ffcd00]" />
          Dados da Receita Federal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Situação Cadastral */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Situação:</span>
            <Badge variant={empresa.situacao_cadastral === "ATIVA" ? "default" : "destructive"} className="flex items-center gap-1">
              {empresa.situacao_cadastral === "ATIVA" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {empresa.situacao_cadastral}
            </Badge>
            {empresa.data_situacao_cadastral && <span className="text-sm text-muted-foreground">
                desde {empresa.data_situacao_cadastral}
              </span>}
          </div>

          {/* Data de Abertura */}
          {empresa.data_abertura && <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Abertura:</span>
              <span className="text-base font-medium text-foreground">
                {empresa.data_abertura}
              </span>
            </div>}

          {/* Natureza Jurídica */}
          {empresa.natureza_juridica && <div className="col-span-full flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-muted-foreground">Natureza Jurídica:</span>
                <span className="text-base font-medium text-foreground ml-2">
                  {empresa.natureza_juridica}
                </span>
              </div>
            </div>}

          {/* Capital Social */}
          {empresa.capital_social && empresa.capital_social > 0 && <div className="col-span-full flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Capital Social:</span>
              <span className="text-base font-medium text-foreground">
                {formatCurrency(empresa.capital_social)}
              </span>
            </div>}
        </div>

        {/* Atividade Principal */}
        {atividadePrincipal.length > 0 && <div>
            <h4 className="font-semibold text-base text-foreground mb-2">
              Atividade Principal
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 border border-gray-200">
              {atividadePrincipal.map((atividade, index) => <div key={index}>
                  <span className="text-xs text-muted-foreground font-mono">
                    {atividade.code}
                  </span>
                  <p className="text-base text-foreground">{atividade.text}</p>
                </div>)}
            </div>
          </div>}

        {/* Atividades Secundárias */}
        {atividadesSecundarias.length > 0 && <div>
            <h4 className="font-semibold text-base text-foreground mb-2">
              Atividades Secundárias ({atividadesSecundarias.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto bg-muted/30 rounded-lg border border-gray-200 p-2">
              {atividadesSecundarias.map((atividade, index) => <div key={index} className="text-sm p-2 hover:bg-muted/50 rounded">
                  <span className="text-xs text-muted-foreground font-mono">
                    {atividade.code}
                  </span>
                  <p className="text-sm text-muted-foreground">{atividade.text}</p>
                </div>)}
            </div>
          </div>}

        {/* Última consulta */}
        {empresa.cnpj_consultado_em && <p className="text-sm text-muted-foreground text-right">
            Última consulta:{" "}
            {format(new Date(empresa.cnpj_consultado_em), "dd/MM/yyyy 'às' HH:mm", {
          locale: ptBR
        })}
          </p>}
      </CardContent>
    </Card>;
}
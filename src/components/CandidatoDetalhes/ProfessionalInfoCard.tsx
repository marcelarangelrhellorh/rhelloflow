import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, DollarSign, Calendar, ExternalLink, FileText, Download, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfessionalInfoCardProps {
  recrutador: string | null;
  pretensaoSalarial: number | null;
  vagaTitulo: string | null;
  vagaId: string | null;
  dataCadastro: string;
  nivel: string | null;
  area: string | null;
  curriculoUrl: string | null;
  portfolioUrl: string | null;
  disponibilidadeMudanca: boolean | null;
  pontosFortes: string | null;
  pontosDesenvolver: string | null;
  parecerFinal: string | null;
  onVagaClick?: () => void;
}

export function ProfessionalInfoCard({
  recrutador,
  pretensaoSalarial,
  vagaTitulo,
  vagaId,
  dataCadastro,
  nivel,
  area,
  curriculoUrl,
  portfolioUrl,
  disponibilidadeMudanca,
  pontosFortes,
  pontosDesenvolver,
  parecerFinal,
  onVagaClick,
}: ProfessionalInfoCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const bucket = fileName.includes('curriculo') ? 'curriculos' : 'portfolios';
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Download iniciado");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do arquivo");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Informações Profissionais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grid Layout */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Recrutador */}
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Recrutador Responsável
            </p>
            {recrutador ? (
              <Badge variant="secondary" className="font-medium">
                {recrutador}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">Não atribuído</p>
            )}
          </div>

          {/* Pretensão Salarial */}
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Pretensão Salarial
            </p>
            <p className="text-base font-semibold text-card-foreground">
              {formatCurrency(pretensaoSalarial)}
            </p>
          </div>

          {/* Nível */}
          {nivel && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nível</p>
              <p className="text-base font-medium text-card-foreground">{nivel}</p>
            </div>
          )}

          {/* Área */}
          {area && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Área</p>
              <p className="text-base font-medium text-card-foreground">{area}</p>
            </div>
          )}

          {/* Disponibilidade para mudança */}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Disponibilidade para Mudança
            </p>
            <div className="flex items-center gap-2">
              {disponibilidadeMudanca ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-base font-medium text-green-600">Sim</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-medium text-muted-foreground">Não</span>
                </>
              )}
            </div>
          </div>

          {/* Data de Cadastro */}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Data de Cadastro
            </p>
            <p className="text-base font-medium text-card-foreground">{formatDate(dataCadastro)}</p>
          </div>
        </div>

        <Separator />

        {/* Documentos */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Documentos Anexados
          </p>
          <div className="space-y-2">
            {curriculoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleDownload(curriculoUrl, 'curriculo.pdf')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Currículo</span>
                </div>
                <Download className="h-4 w-4" />
              </Button>
            )}
            {portfolioUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => handleDownload(portfolioUrl, 'portfolio.pdf')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Portfólio</span>
                </div>
                <Download className="h-4 w-4" />
              </Button>
            )}
            {!curriculoUrl && !portfolioUrl && (
              <p className="text-sm text-muted-foreground italic">Nenhum documento anexado</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Vaga Relacionada */}
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            Vaga Relacionada
          </p>
          {vagaTitulo && vagaId ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={onVagaClick}
            >
              <span className="truncate">{vagaTitulo}</span>
              <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma vaga relacionada</p>
          )}
        </div>

        {/* Avaliação */}
        {(pontosFortes || pontosDesenvolver || parecerFinal) && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Avaliação</h4>
              
              {pontosFortes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pontos Fortes</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{pontosFortes}</p>
                </div>
              )}

              {pontosDesenvolver && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pontos a Desenvolver</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{pontosDesenvolver}</p>
                </div>
              )}

              {parecerFinal && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Parecer Final</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{parecerFinal}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
